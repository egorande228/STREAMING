/**
 * OBS Stream Scheduler
 *
 * Usage:
 *   node scheduler.js            — watch mode: polls schedule every minute, auto start/stop
 *   node scheduler.js stream     — start stream immediately
 *   node scheduler.js stop       — stop stream immediately
 *   node scheduler.js status     — print OBS stream status
 *
 * Env vars: see config.js (or create .env and load with --env-file .env)
 */

import cron from 'node-cron';
import { connect, disconnect, setSourceUrl, switchScene, startStream, stopStream, getStreamStatus } from './obs.js';
import { API, START_OFFSET_MIN, STOP_OFFSET_MIN } from './config.js';

// ── Fetch today's matches from your API ──────────────────────────────────────

async function fetchTodayMatches() {
  const today = new Date().toISOString().slice(0, 10);
  const res   = await fetch(`${API.base}/matches?date=${today}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.matches ?? [];
}

// ── Schedule logic ───────────────────────────────────────────────────────────

/**
 * For each match build two events:
 *   startAt  = scheduled_at − START_OFFSET_MIN
 *   stopAt   = scheduled_at + STOP_OFFSET_MIN  (rough estimate, 120 min default)
 */
function buildEvents(matches) {
  const events = [];
  for (const m of matches) {
    const kickoff  = new Date(m.scheduled_at).getTime();
    const startAt  = new Date(kickoff - START_OFFSET_MIN * 60_000);
    const stopAt   = new Date(kickoff + STOP_OFFSET_MIN  * 60_000);

    // The URL we'll capture — your own site match page
    const captureUrl = `${process.env.CAPTURE_BASE_URL || 'http://localhost:3000'}/en/matches/${m.id}`;

    events.push({ type: 'start', at: startAt, match: m, captureUrl });
    events.push({ type: 'stop',  at: stopAt,  match: m, captureUrl });
  }
  return events.sort((a, b) => a.at - b.at);
}

// ── Watch mode ───────────────────────────────────────────────────────────────

async function watchMode() {
  console.log('[Scheduler] Watch mode started. Polling every 60 seconds.');
  let scheduledEvents = [];

  const tick = async () => {
    const now = Date.now();

    // Refresh schedule at the start of each day (or on first run)
    if (scheduledEvents.length === 0 || new Date().getHours() === 0) {
      try {
        const matches = await fetchTodayMatches();
        scheduledEvents = buildEvents(matches);
        console.log(`[Scheduler] Loaded ${matches.length} matches, ${scheduledEvents.length} events`);
        scheduledEvents.forEach(e =>
          console.log(`  ${e.type.padEnd(5)} at ${e.at.toLocaleTimeString()} — Match #${e.match.id}`)
        );
      } catch (err) {
        console.error('[Scheduler] Failed to fetch schedule:', err.message);
      }
    }

    // Fire events that are due (within the last 60s window)
    const due = scheduledEvents.filter(e => e.at.getTime() <= now && e.at.getTime() > now - 65_000);
    for (const event of due) {
      try {
        await connect();
        if (event.type === 'start') {
          console.log(`[Scheduler] Starting stream for match #${event.match.id}`);
          await setSourceUrl(event.captureUrl);
          await switchScene();
          await startStream();
        } else {
          console.log(`[Scheduler] Stopping stream for match #${event.match.id}`);
          await stopStream();
        }
      } catch (err) {
        console.error(`[Scheduler] Error handling ${event.type} event:`, err.message);
      }
    }

    // Remove past events
    scheduledEvents = scheduledEvents.filter(e => e.at.getTime() > now);
  };

  // Run immediately then every minute
  await tick();
  cron.schedule('* * * * *', tick);
}

// ── CLI commands ─────────────────────────────────────────────────────────────

const cmd = process.argv[2];

if (cmd === 'stream') {
  const url = process.argv[3] || process.env.CAPTURE_BASE_URL || 'http://localhost:3000';
  (async () => {
    await connect();
    await setSourceUrl(url);
    await switchScene();
    await startStream();
    await disconnect();
  })();

} else if (cmd === 'stop') {
  (async () => {
    await connect();
    await stopStream();
    await disconnect();
  })();

} else if (cmd === 'status') {
  (async () => {
    await connect();
    const s = await getStreamStatus();
    console.log('[OBS] Status:', s.outputActive ? `LIVE (${s.outputTimecode})` : 'OFFLINE');
    await disconnect();
  })();

} else {
  // Default: watch mode
  watchMode().catch(console.error);
}
