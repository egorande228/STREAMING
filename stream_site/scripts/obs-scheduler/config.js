// OBS WebSocket connection
export const OBS = {
  host:     process.env.OBS_HOST     || 'localhost',
  port:     Number(process.env.OBS_PORT) || 4455,
  password: process.env.OBS_PASSWORD || '',
};

// Your RTMP server (SRS / nginx-rtmp)
export const RTMP = {
  server: process.env.RTMP_SERVER || 'rtmp://localhost/live',
  key:    process.env.RTMP_KEY    || 'wc26',
};

// Your API to fetch match schedule
export const API = {
  base: process.env.API_BASE || 'http://localhost:8080/api',
};

// OBS scene / source names (set these up once in OBS manually)
export const OBS_SCENE  = process.env.OBS_SCENE  || 'WC26';
export const OBS_SOURCE = process.env.OBS_SOURCE || 'BrowserCapture'; // Browser Source

// How many minutes before match start to begin streaming
export const START_OFFSET_MIN = Number(process.env.START_OFFSET_MIN) || 5;
// How many minutes after scheduled end to stop
export const STOP_OFFSET_MIN  = Number(process.env.STOP_OFFSET_MIN)  || 120;
