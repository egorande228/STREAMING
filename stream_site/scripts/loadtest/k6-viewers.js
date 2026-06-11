import http from 'k6/http';
import { check, sleep } from 'k6';

const target = __ENV.TARGET || 'http://localhost';
const streamKey = __ENV.STREAM_KEY || 'demo';

export const options = {
  scenarios: {
    viewers: {
      executor: 'ramping-vus',
      stages: [
        { duration: '5m', target: Number(__ENV.VUS || 2000) },
        { duration: __ENV.DURATION || '10m', target: Number(__ENV.VUS || 2000) },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const matches = http.get(`${target}/api/matches`);
  check(matches, {
    'matches status 200': (res) => res.status === 200,
    'matches < 500ms': (res) => res.timings.duration < 500,
  });

  const playlist = http.get(`${target}/live/${streamKey}.m3u8`);
  check(playlist, {
    'playlist status 200': (res) => res.status === 200,
    'playlist < 500ms': (res) => res.timings.duration < 500,
  });

  for (let i = 0; i < 3; i += 1) {
    const seq = Math.max(0, __ITER * 3 + i);
    const segment = http.get(`${target}/live/${streamKey}-${seq}.ts`, { tags: { asset: 'segment' } });
    check(segment, { 'segment status 200': (res) => res.status === 200 || res.status === 404 });
  }

  sleep(2);
}
