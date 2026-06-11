import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const errorRate = new Rate('errors');
const wsConnectTime = new Trend('ws_connect_time');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { scenario: 'smoke' },
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 500 },
        { duration: '10m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'load' },
      startTime: '35s', // after smoke
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 500 },
        { duration: '5m', target: 1500 },
        { duration: '3m', target: 0 },
      ],
      tags: { scenario: 'stress' },
      startTime: '20m', // after load
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
    ws_connect_time: ['p(95)<1000'],
  },
};

export default function () {
  // Health check
  let res = http.get(`${BASE_URL}/api/health`);
  check(res, { 'health: status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);

  sleep(0.5);

  // Live matches
  res = http.get(`${BASE_URL}/api/matches?status=live`);
  check(res, {
    'matches live: status 200': (r) => r.status === 200,
    'matches live: has matches key': (r) => {
      try { return JSON.parse(r.body).matches !== undefined; } catch { return false; }
    },
  });
  errorRate.add(res.status !== 200);

  sleep(0.5);

  // Single match
  res = http.get(`${BASE_URL}/api/matches/1`);
  check(res, { 'match detail: status 2xx': (r) => r.status < 300 });
  errorRate.add(res.status >= 400);

  sleep(0.5);

  // Groups / standings
  res = http.get(`${BASE_URL}/api/groups`);
  check(res, { 'groups: status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);

  sleep(0.5);

  // WebSocket live scores (10% of VUs to avoid exhausting connections)
  if (Math.random() < 0.1) {
    const wsUrl = BASE_URL.replace(/^http/, 'ws') + '/api/ws/live';
    const start = Date.now();
    const result = ws.connect(wsUrl, {}, (socket) => {
      wsConnectTime.add(Date.now() - start);
      socket.on('open', () => { socket.setTimeout(() => socket.close(), 3000); });
      socket.on('error', (e) => { errorRate.add(1); });
    });
    check(result, { 'ws: connected': (r) => r && r.status === 101 });
  }

  sleep(1);
}
