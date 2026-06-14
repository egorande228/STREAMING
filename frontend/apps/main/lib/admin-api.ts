const defaultBase = typeof window !== 'undefined' ? window.location.origin : '';
const BASE = String(process.env.NEXT_PUBLIC_ADMIN_API_BASE || defaultBase).replace(/\/$/, '');
const TOKEN_KEY = 'wc26_admin_token';

export interface AdminTeamLite {
  id?: number;
  code?: string;
  name_en?: string;
  name_ru?: string;
}

export interface AdminMatch {
  id: number;
  home_team?: AdminTeamLite | null;
  away_team?: AdminTeamLite | null;
  home_team_id?: number | null;
  away_team_id?: number | null;
  group_id?: number | null;
  scheduled_at: string;
  venue: string;
  city: string;
  stage: string;
  status: string;
  home_score: number;
  away_score: number;
  minute?: number | null;
  stream_redirect_url?: string;
}

export interface AdminStream {
  id: number;
  match_id: number;
  label: string;
  source_type: 'hls' | 'iframe' | 'videojs';
  quality: string;
  language_code: string;
  url: string;
  priority: number;
  region: string;
  commentary_type: string;
  is_active: boolean;
}

export interface AdminMirror {
  id: number;
  domain: string;
  region: string;
  priority: number;
  is_primary: boolean;
  is_active: boolean;
  health_status: string;
  last_checked_at: string | null;
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) ?? '' : '';
}

function authHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  window.location.assign('/admin/login');
}

export async function readAdminJson<T>(
  response: Response,
  options?: { onUnauthorized?: () => void },
): Promise<T> {
  const data = await response.json().catch(() => null) as T | { error?: unknown } | null;

  if (response.status === 401) {
    options?.onUnauthorized?.();
  }

  if (!response.ok) {
    const apiError = data && typeof data === 'object' && 'error' in data ? data.error : null;
    throw new Error(typeof apiError === 'string' && apiError.trim() ? apiError : `Request failed (${response.status})`);
  }

  return data as T;
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init);
  return readAdminJson<T>(response, { onUnauthorized: handleUnauthorized });
}

export const adminApi = {
  login: (username: string, password: string) =>
    fetch(`${BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then((r) => readAdminJson<{ token?: string; error?: string }>(r)),

  matches: {
    list: () => adminRequest<{ matches: AdminMatch[]; total: number } | AdminMatch[]>(`/api/admin/matches`, { headers: authHeaders() }),
    create: (data: Record<string, unknown>) =>
      adminRequest<{ id: number }>(`/api/admin/matches`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      adminRequest<{ ok: boolean }>(`/api/admin/matches/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }),
    delete: (id: number) =>
      adminRequest<{ ok: boolean }>(`/api/admin/matches/${id}`, { method: 'DELETE', headers: authHeaders() }),
    updateScore: (id: number, homeScore: number, awayScore: number, status: string, minute?: number) =>
      adminRequest<{ ok: boolean }>(`/api/admin/matches/${id}/score`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          home_score: homeScore,
          away_score: awayScore,
          status,
          ...(typeof minute === 'number' ? { minute } : {}),
        }),
      }),
  },

  streams: {
    list: () => adminRequest<{ streams: AdminStream[]; total: number } | AdminStream[]>(`/api/admin/streams`, { headers: authHeaders() }),
    create: (data: Record<string, unknown>) =>
      adminRequest<{ id: number }>(`/api/admin/streams`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      adminRequest<{ ok: boolean }>(`/api/admin/streams/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }),
    delete: (id: number) =>
      adminRequest<{ ok: boolean }>(`/api/admin/streams/${id}`, { method: 'DELETE', headers: authHeaders() }),
  },

  mirrors: {
    list: () => adminRequest<{ mirrors: AdminMirror[] } | AdminMirror[]>(`/api/admin/mirrors`, { headers: authHeaders() }),
    create: (data: Record<string, unknown>) =>
      adminRequest<{ id: number }>(`/api/admin/mirrors`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      adminRequest<{ ok: boolean }>(`/api/admin/mirrors/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }),
    delete: (id: number) =>
      adminRequest<{ ok: boolean }>(`/api/admin/mirrors/${id}`, { method: 'DELETE', headers: authHeaders() }),
    activate: (id: number) =>
      adminRequest<{ ok: boolean; domain: string }>(`/api/admin/mirrors/${id}/activate`, { method: 'POST', headers: authHeaders() }),
  },
};
