import OBSWebSocket from 'obs-websocket-js';
import { OBS, OBS_SCENE, OBS_SOURCE, RTMP } from './config.js';

const obs = new OBSWebSocket();
let connected = false;

export async function connect() {
  if (connected) return;
  await obs.connect(`ws://${OBS.host}:${OBS.port}`, OBS.password || undefined);
  connected = true;
  console.log(`[OBS] Connected to ${OBS.host}:${OBS.port}`);
}

export async function disconnect() {
  if (!connected) return;
  await obs.disconnect();
  connected = false;
  console.log('[OBS] Disconnected');
}

// Set the URL of the Browser Source in OBS
export async function setSourceUrl(url) {
  await obs.call('SetInputSettings', {
    inputName: OBS_SOURCE,
    inputSettings: {
      url,
      width:  1920,
      height: 1080,
      fps:    30,
      css:    'body { background: #000; overflow: hidden; }',
      shutdown: false,
    },
  });
  console.log(`[OBS] Browser source URL → ${url}`);
}

// Switch to the streaming scene
export async function switchScene() {
  await obs.call('SetCurrentProgramScene', { sceneName: OBS_SCENE });
  console.log(`[OBS] Scene → ${OBS_SCENE}`);
}

export async function startStream() {
  const status = await obs.call('GetStreamStatus');
  if (status.outputActive) {
    console.log('[OBS] Already streaming');
    return;
  }
  // Set RTMP server + key via output settings
  await obs.call('SetStreamServiceSettings', {
    streamServiceType: 'rtmp_custom',
    streamServiceSettings: {
      server: RTMP.server,
      key:    RTMP.key,
    },
  });
  await obs.call('StartStream');
  console.log(`[OBS] Stream started → ${RTMP.server}/${RTMP.key}`);
}

export async function stopStream() {
  const status = await obs.call('GetStreamStatus');
  if (!status.outputActive) {
    console.log('[OBS] Not streaming, nothing to stop');
    return;
  }
  await obs.call('StopStream');
  console.log('[OBS] Stream stopped');
}

export async function getStreamStatus() {
  return obs.call('GetStreamStatus');
}
