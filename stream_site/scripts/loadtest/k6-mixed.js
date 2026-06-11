import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

const target = __ENV.TARGET || 'http://localhost';
const wsTarget = target.replace(/^http/, 'ws');
const matchId = __ENV.MATCH_ID || '1';
const streamKey = __ENV.STREAM_KEY || 'demo';

export const options = {
  scenarios: {
    viewers: {
      executor: 'constant-vus',
      exec: 'viewerFlow',
      vus: Math.floor(Number(__ENV.VUS || 1000) * 0.7),
      duration: __ENV.DURATION || '10m',
    },
    chat: {
      executor: 'constant-vus',
      exec: 'chatFlow',
      vus: Math.max(1, Math.floor(Number(__ENV.VUS || 1000) * 0.1)),
      duration: __ENV.DURATION || '10m',
    },
    browse: {
      executor: 'constant-vus',
      exec: 'browseFlow',
      vus: Math.max(1, Math.floor(Number(__ENV.VUS || 1000) * 0.2)),
      duration: __ENV.DURATION || '10m',
    },
  },
};

export function viewerFlow() {
  check(http.get(`${target}/api/matches`), { 'viewer matches 200': (res) => res.status === 200 });
  check(http.get(`${target}/live/${streamKey}.m3u8`), { 'viewer playlist 200': (res) => res.status === 200 });
  sleep(2);
}

export function chatFlow() {
  const username = `mixed-${__VU}`;
  ws.connect(`${wsTarget}/api/ws/chat/${matchId}?username=${encodeURIComponent(username)}`, {}, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({ text: `ping ${username}` }));
      socket.setTimeout(() => socket.close(), 5000);
    });
  });
  sleep(1);
}

export function browseFlow() {
  check(http.get(`${target}/api/groups`), { 'groups 200': (res) => res.status === 200 });
  check(http.get(`${target}/api/matches/${matchId}`), { 'match detail 200': (res) => res.status === 200 });
  sleep(3);
}
