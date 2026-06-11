'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

interface StreamStatus {
  active: {
    key: string;
    url: string;
    started_at: string;
    uptime_s: number;
  } | null;
}

interface Match {
  id: number;
  stage: string;
  home_team?: { code: string };
  away_team?: { code: string };
  scheduled_at: string;
}

const RESOLUTIONS = [
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
];

export default function LaunchStreamPage() {
  const [status, setStatus] = useState<StreamStatus>({ active: null });
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hlsReady, setHlsReady] = useState(false);

  const [form, setForm] = useState({
    url: '',
    key: 'live1',
    match_id: '',
    resolution: '720p',
    fps: '30',
  });

  useEffect(() => {
    adminApi.matches.list().then((r) => setMatches(r.matches ?? [])).catch(() => {});
    pollStatus();
    const t = setInterval(pollStatus, 5000);
    return () => clearInterval(t);
  }, []);

  async function pollStatus() {
    try {
      const s = await adminApi.streamLaunch.status();
      setStatus(s);
    } catch {}
  }

  async function handleStart() {
    setLoading(true);
    setError('');
    setHlsReady(false);
    const res = RESOLUTIONS.find((r) => r.label === form.resolution) ?? RESOLUTIONS[0];
    try {
      const data = await adminApi.streamLaunch.start({
        url: form.url,
        key: form.key,
        match_id: form.match_id ? Number(form.match_id) : undefined,
        width: res.width,
        height: res.height,
        fps: Number(form.fps),
      });
      if (data.error) {
        setError(data.error);
      } else {
        await pollStatus();
        setTimeout(() => setHlsReady(true), 8000);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start stream');
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    setError('');
    setHlsReady(false);
    try {
      const data = await adminApi.streamLaunch.stop(status.active?.key);
      if (data.error) setError(data.error);
      else await pollStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to stop stream');
    } finally {
      setLoading(false);
    }
  }

  const isActive = !!status.active && status.active.key !== '__debug__';
  const hlsURL = isActive ? `/live/${status.active!.key}.m3u8` : null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Launch Browser Stream</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Status */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-sm font-medium text-gray-300">
            {isActive
              ? `Streaming: ${status.active!.key} — ${Math.floor(status.active!.uptime_s / 60)}m ${status.active!.uptime_s % 60}s`
              : 'No active stream'}
          </span>
        </div>
        {isActive && (
          <p className="text-xs text-gray-500 mt-1 ml-5 truncate">URL: {status.active!.url}</p>
        )}
      </div>

      {/* Form */}
      <div className="bg-gray-900 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Target URL *</label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://docs.google.com/presentation/..."
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stream Key</label>
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value.replace(/\s/g, '') })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Attach to Match</label>
            <select
              value={form.match_id}
              onChange={(e) => setForm({ ...form, match_id: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">— optional —</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  #{m.id} {m.home_team?.code ?? '?'} vs {m.away_team?.code ?? '?'} ({m.stage})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Resolution</label>
            <select
              value={form.resolution}
              onChange={(e) => setForm({ ...form, resolution: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.label} value={r.label}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">FPS</label>
            <select
              value={form.fps}
              onChange={(e) => setForm({ ...form, fps: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="30">30</option>
              <option value="60">60</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleStart}
            disabled={loading || isActive || !form.url || !form.key}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors"
          >
            {loading && !isActive ? 'Starting...' : 'Start Stream'}
          </button>
          <button
            onClick={handleStop}
            disabled={loading || !isActive}
            className="px-6 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-medium text-sm transition-colors"
          >
            {loading && isActive ? 'Stopping...' : 'Stop Stream'}
          </button>
        </div>
      </div>

      {/* HLS Preview */}
      {hlsReady && hlsURL && (
        <div className="bg-gray-900 rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-400">HLS output:</p>
          <code className="text-xs text-green-400">{hlsURL}</code>
          <video
            controls
            autoPlay
            muted
            className="w-full rounded mt-2 bg-black"
            src={hlsURL}
          />
        </div>
      )}

      {/* Google Login hint */}
      <details className="bg-gray-900/50 border border-gray-800 rounded-lg">
        <summary className="px-4 py-3 text-sm text-gray-400 cursor-pointer select-none">
          First-time Google login (for private Docs)
        </summary>
        <div className="px-4 pb-4 text-xs text-gray-500 space-y-1 mt-2">
          <p>1. Call debug mode to open Chromium with remote debugging:</p>
          <code className="block bg-gray-800 px-3 py-2 rounded text-gray-300">
            {`POST /api/admin/stream/debug { "enable": true }`}
          </code>
          <p>2. SSH tunnel from your machine:</p>
          <code className="block bg-gray-800 px-3 py-2 rounded text-gray-300">
            ssh -L 9222:localhost:9222 your-vps
          </code>
          <p>3. Open <strong>chrome://inspect</strong> in your local Chrome, click Inspect, log into Google.</p>
          <p>4. Stop debug mode — the profile is saved permanently.</p>
        </div>
      </details>
    </div>
  );
}
