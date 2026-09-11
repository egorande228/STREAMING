// Adapter contract: withAccountLock MUST provide exclusive, fenced ownership
// across processes. Reservations must be durable; expired locks alone never free
// a subscription. No network/server adapter is enabled by importing this module.
export async function executeScheduledJob(job, control, clock = Date.now) {
  if (!job || !/^\d+$/.test(job.id) || !/^account[1-9]\d*$/.test(job.accountId) ||
      !/^bein-ar-[1-4]$/.test(job.channel) || !/^src_[a-f0-9]{24}$/.test(job.sourceRef) ||
      !Number.isFinite(job.start) || !Number.isFinite(job.end) || job.end <= job.start ||
      job.end - job.start > 6 * 3600000) throw Error('invalid_job');
  const identity = { id: job.id, accountId: job.accountId, channel: job.channel, sourceRef: job.sourceRef, start: job.start, end: job.end };
  return control.withAccountLock(job.accountId, async lock => {
    const initial = await lock.snapshot();
    if (initial.manualHold) return { action: 'hold', reason: 'manual_stream' };
    if (initial.reservation && Object.keys(identity).some(key => initial.reservation[key] !== identity[key])) return { action: 'hold', reason: 'account_reserved' };
    if (initial.recoveryRequired) return { action: 'hold', reason: 'recovery_required' };
    const now = clock();
    if (now < job.start) return { action: 'wait', dueAt: job.start };
    const fenced = async () => {
      await lock.assertOwnership(identity);
      const s = await lock.snapshot();
      if (s.manualHold) throw Error('manual_hold_changed');
    };
    const stopOwned = async () => {
      await fenced();
      // Must remove only this job's publication, then stop only its process.
      await lock.unpublish(identity);
      await fenced(); await lock.stop(identity);
      await fenced();
      if (!(await lock.isStopped(identity))) throw Error('stop_unconfirmed');
      await lock.release(identity);
    };
    if (now >= job.end) {
      if (!initial.reservation) return { action: 'expired' };
      try { await stopOwned(); return { action: 'stopped' }; }
      catch { await lock.markRecovery(identity); return { action: 'hold', reason: 'cleanup_unconfirmed' }; }
    }
    if (job.scheduleFresh !== true || job.channelConfirmed !== true || !Number.isFinite(job.checkedAt) ||
        job.checkedAt > now || now - job.checkedAt > 3600000) return { action: 'hold', reason: 'schedule_unconfirmed' };
    // reserve must persist before any upstream connection and fail if occupied.
    if (!initial.reservation) await lock.reserve(identity);
    try {
      await fenced();
      if (!(await lock.isRunning(identity))) await lock.start(identity);
      await fenced();
      // Probe the existing output, never create a second IPTV input connection.
      const probe = await lock.probeOutput(identity);
      if (!probe || probe.video !== true || probe.audio !== true || !(probe.frames > 0) || probe.channel !== job.channel) throw Error('playback_unverified');
      await fenced();
      if (clock() >= job.end) { await stopOwned(); return { action: 'stopped' }; }
      await lock.publish(identity);
      return { action: 'running', id: job.id, accountId: job.accountId, channel: job.channel };
    } catch {
      try { await stopOwned(); return { action: 'failed', cleanedUp: true }; }
      catch { await lock.markRecovery(identity); return { action: 'hold', reason: 'cleanup_unconfirmed' }; }
    }
  });
}
