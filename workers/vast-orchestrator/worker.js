const VAST_API_BASE = 'https://console.vast.ai/api/v0';
const HLS_ORIGIN_KV_KEY = 'hls_origin:aws';
const STATE_KV_KEY = 'vast:orchestrator:state:v1';
const PLAN_TTL_SECONDS = 5 * 60;
const BOOTSTRAP_TTL_SECONDS = 20 * 60;
const RESTREAM_API_BASE = 'https://kinglive-football-api.figurator228.workers.dev';
const RESTREAM_PUBLIC_BASE_URL = 'https://cdn-hls.livekinglive.win/aws/live';

export default {
  async fetch(request, env, ctx) {
    try {
      return await routeRequest(request, env, ctx);
    } catch (error) {
      console.error(JSON.stringify({
        event: 'vast_orchestrator_error',
        path: new URL(request.url).pathname,
        message: error instanceof Error ? error.message : String(error),
      }));
      return jsonResponse({ error: 'internal_error' }, 500);
    }
  },
};

export async function routeRequest(request, env = {}, _ctx = {}) {
  const url = new URL(request.url);

  if (url.pathname === '/health' && request.method === 'GET') {
    return jsonResponse({ ok: true });
  }

  if (url.pathname === '/api/bootstrap/vast' && request.method === 'POST') {
    return routeBootstrap(request, env);
  }

  if (!url.pathname.startsWith('/api/admin/vast/')) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  if (!(await isAuthorized(request, env.ADMIN_TOKEN))) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  if (url.pathname === '/api/admin/vast/plan' && request.method === 'POST') {
    return routePlan(request, env);
  }
  if (url.pathname === '/api/admin/vast/create' && request.method === 'POST') {
    return routeCreate(request, env);
  }
  if (url.pathname === '/api/admin/vast/status' && request.method === 'GET') {
    return routeStatus(env);
  }
  if (url.pathname === '/api/admin/vast/activate' && request.method === 'POST') {
    return routeActivate(request, env);
  }
  if (url.pathname === '/api/admin/vast/stop' && request.method === 'POST') {
    return routeManage(request, env, 'stopped', 'STOP VAST INSTANCE');
  }
  if (url.pathname === '/api/admin/vast/start' && request.method === 'POST') {
    return routeManage(request, env, 'running', 'START VAST INSTANCE');
  }
  if (url.pathname === '/api/admin/vast/destroy' && request.method === 'POST') {
    return routeDestroy(request, env);
  }

  return jsonResponse({ error: 'not_found' }, 404);
}

async function routePlan(request, env) {
  requireBindings(env, ['CONTROL_KV', 'VAST_API_KEY']);
  const input = await readJson(request);
  const allowBackup = input.allow_backup === true;
  const minimumCpu = allowBackup ? numberEnv(env.BACKUP_CPU_CORES, 16) : numberEnv(env.PRIMARY_CPU_CORES, 24);
  const offers = await searchOffers(env, minimumCpu);
  const selected = offers[0];
  if (!selected) {
    return jsonResponse({ error: allowBackup ? 'no_backup_offer' : 'no_primary_offer', minimum_cpu: minimumCpu }, 404);
  }

  const planToken = randomToken();
  const digest = await sha256Hex(planToken);
  const snapshot = sanitizeOffer(selected);
  await env.CONTROL_KV.put(planKey(digest), JSON.stringify({ offer: snapshot, allow_backup: allowBackup }), {
    expirationTtl: PLAN_TTL_SECONDS,
  });

  return jsonResponse({
    plan_token: planToken,
    expires_in_seconds: PLAN_TTL_SECONDS,
    tier: allowBackup ? 'backup' : 'primary',
    offer: snapshot,
    billing_note: 'bandwidth_charged_separately',
  });
}

async function routeCreate(request, env) {
  requireBindings(env, ['CONTROL_KV', 'VAST_API_KEY', 'PUBLIC_BASE_URL']);
  const existing = await readState(env);
  if (existing?.instance_id) return jsonResponse({ error: 'managed_instance_already_exists', state: sanitizeState(existing) }, 409);

  const input = await readJson(request);
  if (input.confirm !== 'CREATE VAST INSTANCE' || typeof input.plan_token !== 'string') {
    return jsonResponse({ error: 'confirmation_required' }, 400);
  }

  const planDigest = await sha256Hex(input.plan_token);
  const key = planKey(planDigest);
  const rawPlan = await env.CONTROL_KV.get(key);
  if (!rawPlan) return jsonResponse({ error: 'plan_expired_or_used' }, 409);
  await env.CONTROL_KV.delete(key);

  const plan = parseObject(rawPlan);
  const offer = plan?.offer;
  if (!isOfferWithinLimits(offer, env, plan?.allow_backup === true)) {
    return jsonResponse({ error: 'plan_outside_limits' }, 409);
  }

  const currentOffer = await findOfferById(env, offer.id);
  if (!isOfferWithinLimits(currentOffer, env, plan?.allow_backup === true)) {
    return jsonResponse({ error: 'offer_unavailable_or_changed' }, 409);
  }

  const template = await findTemplate(env);
  if (!template?.hash_id) return jsonResponse({ error: 'vast_template_not_found' }, 503);

  const bootstrapToken = randomToken();
  const bootstrapDigest = await sha256Hex(bootstrapToken);
  const provisionalState = {
    version: 1,
    status: 'creating',
    offer,
    created_at: new Date().toISOString(),
  };

  await env.CONTROL_KV.put(bootstrapKey(bootstrapDigest), JSON.stringify({ created_at: provisionalState.created_at }), {
    expirationTtl: BOOTSTRAP_TTL_SECONDS,
  });

  let createdInstanceId = null;
  try {
    const createResult = await vastFetch(env, `/asks/${currentOffer.id}/`, {
      method: 'PUT',
      body: {
        template_hash_id: template.hash_id,
        disk: numberEnv(env.DISK_GB, 50),
        target_state: 'running',
        label: 'kinglive-managed-origin',
        env: {
          KINGLIVE_BOOTSTRAP_URL: `${String(env.PUBLIC_BASE_URL).replace(/\/$/, '')}/api/bootstrap/vast`,
          KINGLIVE_BOOTSTRAP_TOKEN: bootstrapToken,
          KINGLIVE_REPO_REF: String(env.KINGLIVE_REPO_REF || 'codex/dami-stream-fixes'),
          '-p 80:80': '1',
          '-p 8080:8080': '1',
        },
      },
    });
    const instanceId = Number(createResult?.new_contract);
    if (!Number.isInteger(instanceId) || instanceId <= 0) throw new Error('vast_create_missing_instance_id');
    createdInstanceId = instanceId;

    const state = {
      ...provisionalState,
      offer: sanitizeOffer(currentOffer),
      status: 'provisioning',
      instance_id: instanceId,
    };
    await env.CONTROL_KV.put(STATE_KV_KEY, JSON.stringify(state));
    await env.CONTROL_KV.put(bootstrapKey(bootstrapDigest), JSON.stringify({ instance_id: instanceId }), {
      expirationTtl: BOOTSTRAP_TTL_SECONDS,
    });
    return jsonResponse({ ok: true, state: sanitizeState(state) }, 201);
  } catch (error) {
    await env.CONTROL_KV.delete(bootstrapKey(bootstrapDigest));
    if (createdInstanceId) {
      try {
        await vastFetch(env, `/instances/${createdInstanceId}/`, { method: 'DELETE' });
      } catch (cleanupError) {
        console.error(JSON.stringify({
          event: 'vast_create_cleanup_failed',
          instance_id: createdInstanceId,
          message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        }));
      }
    }
    throw error;
  }
}

async function routeBootstrap(request, env) {
  requireBindings(env, ['CONTROL_KV', 'RESTREAM_SYNC_TOKEN']);
  const token = bearerToken(request);
  if (!token) return jsonResponse({ error: 'unauthorized' }, 401);

  const digest = await sha256Hex(token);
  const key = bootstrapKey(digest);
  const record = parseObject(await env.CONTROL_KV.get(key));
  if (!record?.instance_id) return jsonResponse({ error: 'bootstrap_token_invalid' }, 401);

  const state = await readState(env);
  if (!state || Number(state.instance_id) !== Number(record.instance_id)) {
    return jsonResponse({ error: 'bootstrap_instance_mismatch' }, 409);
  }

  state.bootstrap_complete_at = new Date().toISOString();
  state.status = 'configured';
  await env.CONTROL_KV.put(STATE_KV_KEY, JSON.stringify(state));
  await env.CONTROL_KV.delete(key);

  return jsonResponse({
    restream_api_url: `${RESTREAM_API_BASE}/api/restreams?origin_id=aws-us-1`,
    restream_overlay_api_url: `${RESTREAM_API_BASE}/api/restream-overlays`,
    restream_public_base_url: RESTREAM_PUBLIC_BASE_URL,
    restream_sync_token: String(env.RESTREAM_SYNC_TOKEN),
  });
}

async function routeStatus(env) {
  requireBindings(env, ['CONTROL_KV', 'VAST_API_KEY']);
  const state = await readState(env);
  if (!state?.instance_id) return jsonResponse({ state: null });

  const instance = await getInstance(env, state.instance_id);
  return jsonResponse({ state: sanitizeState(state), instance: sanitizeInstance(instance) });
}

async function routeActivate(request, env) {
  requireBindings(env, ['CONTROL_KV', 'VAST_API_KEY']);
  const input = await readJson(request);
  if (input.confirm !== 'ACTIVATE VAST ORIGIN') return jsonResponse({ error: 'confirmation_required' }, 400);

  const state = await readState(env);
  if (!state?.instance_id || !state.bootstrap_complete_at) return jsonResponse({ error: 'instance_not_configured' }, 409);
  const instance = await getInstance(env, state.instance_id);
  if (instance?.actual_status !== 'running') return jsonResponse({ error: 'instance_not_running' }, 409);

  const host = publicIpv4(instance.public_ipaddr || instance.public_ip || instance.ssh_host);
  const port = mappedPort(instance, 8080) || mappedPort(instance, 80);
  if (!host || !port) return jsonResponse({ error: 'origin_mapping_not_ready' }, 409);

  const origin = `http://${host}:${port}`;
  const health = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(8000) });
  if (!health.ok) return jsonResponse({ error: 'origin_health_failed', status: health.status }, 409);

  const previousOrigin = await env.CONTROL_KV.get(HLS_ORIGIN_KV_KEY);
  await env.CONTROL_KV.put(HLS_ORIGIN_KV_KEY, origin);
  state.status = 'active';
  state.origin = origin;
  state.activated_at = new Date().toISOString();
  try {
    await env.CONTROL_KV.put(STATE_KV_KEY, JSON.stringify(state));
  } catch (error) {
    if (previousOrigin) {
      await env.CONTROL_KV.put(HLS_ORIGIN_KV_KEY, previousOrigin);
    } else {
      await env.CONTROL_KV.delete(HLS_ORIGIN_KV_KEY);
    }
    throw error;
  }
  return jsonResponse({ ok: true, state: sanitizeState(state) });
}

async function routeManage(request, env, desiredState, confirmation) {
  requireBindings(env, ['CONTROL_KV', 'VAST_API_KEY']);
  const input = await readJson(request);
  if (input.confirm !== confirmation) return jsonResponse({ error: 'confirmation_required' }, 400);
  const state = await readState(env);
  if (!state?.instance_id) return jsonResponse({ error: 'managed_instance_not_found' }, 404);

  await vastFetch(env, `/instances/${state.instance_id}/`, { method: 'PUT', body: { state: desiredState } });
  state.status = desiredState;
  state.updated_at = new Date().toISOString();
  await env.CONTROL_KV.put(STATE_KV_KEY, JSON.stringify(state));
  return jsonResponse({ ok: true, state: sanitizeState(state), storage_billing_continues: desiredState === 'stopped' });
}

async function routeDestroy(request, env) {
  requireBindings(env, ['CONTROL_KV', 'VAST_API_KEY']);
  const input = await readJson(request);
  if (input.confirm !== 'DESTROY VAST INSTANCE') return jsonResponse({ error: 'confirmation_required' }, 400);
  const state = await readState(env);
  if (!state?.instance_id) return jsonResponse({ error: 'managed_instance_not_found' }, 404);

  await vastFetch(env, `/instances/${state.instance_id}/`, { method: 'DELETE' });
  const configuredOrigin = await env.CONTROL_KV.get(HLS_ORIGIN_KV_KEY);
  if (state.origin && configuredOrigin === state.origin) await env.CONTROL_KV.delete(HLS_ORIGIN_KV_KEY);
  await env.CONTROL_KV.delete(STATE_KV_KEY);
  return jsonResponse({ ok: true, destroyed_instance_id: Number(state.instance_id) });
}

async function searchOffers(env, minimumCpu) {
  const body = {
    verified: { eq: true },
    rentable: { eq: true },
    rented: { eq: false },
    type: 'ondemand',
    dph_total: { lte: numberEnv(env.MAX_PRICE_PER_HOUR, 0.35) },
    cpu_cores_effective: { gte: minimumCpu },
    cpu_ram: { gte: numberEnv(env.MIN_CPU_RAM_MB, 64000) },
    inet_down: { gte: numberEnv(env.MIN_NETWORK_MBPS, 1000) },
    inet_up: { gte: numberEnv(env.MIN_NETWORK_MBPS, 1000) },
    direct_port_count: { gte: 3 },
    limit: 25,
    order: [['dph_total', 'asc'], ['cpu_cores_effective', 'desc']],
  };
  const result = await vastFetch(env, '/bundles/', { method: 'POST', body });
  return Array.isArray(result?.offers) ? result.offers.filter((offer) => isOfferWithinLimits(offer, env, minimumCpu < numberEnv(env.PRIMARY_CPU_CORES, 24))) : [];
}

async function findOfferById(env, offerId) {
  const result = await vastFetch(env, '/bundles/', {
    method: 'POST',
    body: {
      id: { eq: Number(offerId) },
      rentable: { eq: true },
      rented: { eq: false },
      type: 'ondemand',
      limit: 1,
    },
  });
  return Array.isArray(result?.offers) ? result.offers[0] || null : null;
}

async function findTemplate(env) {
  const filters = JSON.stringify({ name: { eq: String(env.VAST_TEMPLATE_NAME || 'kinglive-hls-origin') } });
  const cols = JSON.stringify(['id', 'name', 'hash_id', 'image', 'tag', 'ssh_direct', 'use_ssh', 'recommended_disk_space']);
  const params = new URLSearchParams({ select_filters: filters, select_cols: cols });
  const result = await vastFetch(env, `/template/?${params.toString()}`);
  return Array.isArray(result?.templates) ? result.templates[0] : null;
}

async function getInstance(env, instanceId) {
  const result = await vastFetch(env, `/instances/${Number(instanceId)}/`);
  if (Array.isArray(result?.instances)) return result.instances[0] || null;
  return result?.instances && typeof result.instances === 'object' ? result.instances : null;
}

async function vastFetch(env, path, options = {}) {
  const init = {
    method: options.method || 'GET',
    headers: { Authorization: `Bearer ${String(env.VAST_API_KEY)}` },
  };
  if (options.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  const response = await fetch(`${VAST_API_BASE}${path}`, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) throw new Error(`vast_api_${response.status}`);
  return data;
}

function isOfferWithinLimits(offer, env, allowBackup) {
  if (!offer || typeof offer !== 'object') return false;
  const minimumCpu = allowBackup ? numberEnv(env.BACKUP_CPU_CORES, 16) : numberEnv(env.PRIMARY_CPU_CORES, 24);
  return Number(offer.dph_total) <= numberEnv(env.MAX_PRICE_PER_HOUR, 0.35)
    && Number(offer.cpu_cores_effective) >= minimumCpu
    && Number(offer.cpu_ram) >= numberEnv(env.MIN_CPU_RAM_MB, 64000)
    && Number(offer.inet_down) >= numberEnv(env.MIN_NETWORK_MBPS, 1000)
    && Number(offer.inet_up) >= numberEnv(env.MIN_NETWORK_MBPS, 1000)
    && Number(offer.direct_port_count) >= 3;
}

function sanitizeOffer(offer) {
  return {
    id: Number(offer.id),
    price_per_hour: round(Number(offer.dph_total), 4),
    cpu_cores_effective: Number(offer.cpu_cores_effective),
    cpu_cores_host: Number(offer.cpu_cores),
    cpu_ram_mb: Number(offer.cpu_ram),
    inet_down_mbps: Number(offer.inet_down),
    inet_up_mbps: Number(offer.inet_up),
    direct_port_count: Number(offer.direct_port_count),
    gpu_name: String(offer.gpu_name || ''),
    geolocation: String(offer.geolocation || ''),
  };
}

function sanitizeInstance(instance) {
  if (!instance) return null;
  return {
    id: Number(instance.id),
    actual_status: String(instance.actual_status || ''),
    intended_status: String(instance.intended_status || ''),
    status_message: String(instance.status_msg || '').slice(0, 200),
    public_ip: publicIpv4(instance.public_ipaddr || instance.public_ip || instance.ssh_host),
    port_80: mappedPort(instance, 80),
    port_8080: mappedPort(instance, 8080),
  };
}

function sanitizeState(state) {
  if (!state || typeof state !== 'object') return null;
  return {
    version: Number(state.version || 1),
    instance_id: Number(state.instance_id || 0) || null,
    status: String(state.status || ''),
    offer: state.offer || null,
    origin: state.origin || null,
    created_at: state.created_at || null,
    bootstrap_complete_at: state.bootstrap_complete_at || null,
    activated_at: state.activated_at || null,
    updated_at: state.updated_at || null,
  };
}

function mappedPort(instance, containerPort) {
  const ports = instance?.ports;
  if (!ports || typeof ports !== 'object') return null;
  const candidates = [ports[`${containerPort}/tcp`], ports[String(containerPort)]];
  for (const candidate of candidates) {
    const entries = Array.isArray(candidate) ? candidate : [candidate];
    for (const entry of entries) {
      const port = Number(entry?.HostPort ?? entry?.host_port ?? entry);
      if (Number.isInteger(port) && port > 0 && port <= 65535) return port;
    }
  }
  return null;
}

function publicIpv4(value) {
  const text = String(value || '').trim();
  const parts = text.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return null;
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return null;
  if (a === 100 && b >= 64 && b <= 127) return null;
  if (a === 169 && b === 254) return null;
  if (a === 172 && b >= 16 && b <= 31) return null;
  if (a === 192 && b === 168) return null;
  return text;
}

async function readState(env) {
  return parseObject(await env.CONTROL_KV.get(STATE_KV_KEY));
}

function parseObject(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

async function readJson(request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 16 * 1024) throw new Error('request_body_too_large');
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function requireBindings(env, names) {
  const missing = names.filter((name) => !env?.[name]);
  if (missing.length) throw new Error(`missing_binding_${missing.join('_')}`);
}

async function isAuthorized(request, expected) {
  const provided = bearerToken(request);
  if (!provided || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(String(expected))),
  ]);
  if (typeof crypto.subtle.timingSafeEqual === 'function') return crypto.subtle.timingSafeEqual(left, right);
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}

function bearerToken(request) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') || '');
  return match ? match[1].trim() : '';
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function planKey(digest) {
  return `vast:plan:${digest}`;
}

function bootstrapKey(digest) {
  return `vast:bootstrap:${digest}`;
}

function numberEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export { isOfferWithinLimits, mappedPort, publicIpv4, sanitizeOffer };
