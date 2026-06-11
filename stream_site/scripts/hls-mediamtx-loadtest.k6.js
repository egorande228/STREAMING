import http from 'k6/http';
import { check, sleep } from 'k6';

const MASTER = __ENV.BASE || 'http://127.0.0.1/live/test/index.m3u8';
const seen = {};

export const options = {
  stages: [
    { duration: __ENV.RAMP || '20s', target: Number(__ENV.VUS || 500) },
    { duration: __ENV.HOLD || '60s', target: Number(__ENV.VUS || 500) },
    { duration: __ENV.RAMP_DOWN || '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

function abs(base, ref) {
  if (!ref) return '';
  if (ref.startsWith('http://') || ref.startsWith('https://')) return ref;
  return new URL(ref, base).toString();
}

function playlistLines(body) {
  return String(body || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

export default function () {
  const params = { redirects: 5, timeout: __ENV.TIMEOUT || '15s' };
  const master = http.get(MASTER, params);
  check(master, { 'master ok': (r) => r.status === 200 && r.body && r.body.includes('#EXTM3U') });

  const mediaRef = playlistLines(master.body)[0];
  const mediaUrl = abs(master.url || MASTER, mediaRef);
  const media = http.get(mediaUrl, params);
  check(media, { 'playlist ok': (r) => r.status === 200 && r.body && r.body.includes('#EXTM3U') });

  const segmentRefs = playlistLines(media.body).filter((line) => /\.(ts|m4s|mp4)(\?|$)/.test(line));
  const latestSegment = segmentRefs[segmentRefs.length - 1];
  const segmentUrl = abs(media.url || mediaUrl, latestSegment);

  if (segmentUrl && !seen[segmentUrl]) {
    seen[segmentUrl] = true;
  }

  const segment = http.get(segmentUrl, params);
  check(segment, { 'segment ok': (r) => r.status === 200 && r.body && r.body.length > 1024 });

  sleep(Number(__ENV.SLEEP || 2));
}
