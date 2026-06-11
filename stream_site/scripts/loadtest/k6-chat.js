import ws from 'k6/ws';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const delivered = new Counter('chat_delivered');
const sent = new Counter('chat_sent');

const target = (__ENV.TARGET || 'http://localhost').replace(/^http/, 'ws');
const matchId = __ENV.MATCH_ID || '1';

export const options = {
  scenarios: {
    chat: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 2000),
      duration: __ENV.DURATION || '10m',
    },
  },
  thresholds: {
    checks: ['rate>0.999'],
  },
};

export default function () {
  const username = `vu-${__VU}`;
  const url = `${target}/api/ws/chat/${matchId}?username=${encodeURIComponent(username)}`;
  const res = ws.connect(url, {}, (socket) => {
    socket.on('open', () => {
      socket.setInterval(() => {
        sent.add(1);
        socket.send(JSON.stringify({ text: `hello from ${username}` }));
      }, 1000);
    });

    socket.on('message', () => {
      delivered.add(1);
    });

    socket.setTimeout(() => socket.close(), 10 * 60 * 1000);
  });

  check(res, { 'ws upgrade 101': (r) => r && r.status === 101 });
}
