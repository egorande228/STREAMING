const FALLBACK_MIRRORS = [
  'https://wc26.live',
  'https://worldcup2026.tv',
  'https://wc2026.stream',
];

const MIRRORS_KEY = 'wc26_mirrors';
const TIMEOUT_MS = 5000;
const SERVER_BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://localhost:8080';

type NextFetchInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

function withFreshCache(options?: RequestInit): NextFetchInit {
  const base: NextFetchInit = {
    cache: 'no-store',
  };

  if (typeof window === 'undefined') {
    return {
      ...base,
      next: { revalidate: 0 },
      ...(options as NextFetchInit),
    };
  }

  return {
    ...base,
    ...(options as NextFetchInit),
  };
}

function getStoredMirrors(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MIRRORS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeMirrors(mirrors: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MIRRORS_KEY, JSON.stringify(mirrors));
  } catch {}
}

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const freshOptions = withFreshCache(options);
    return await fetch(url, { ...freshOptions, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Last-resort: query Cloudflare DoH for a TXT record that holds the current working mirror.
// Set TXT record on your primary domain: mirror=https://wc26.live
// Even if wc26.live is HTTP-blocked, the DoH query goes to cloudflare-dns.com (HTTPS), which isn't.
async function discoverMirrorViaDns(): Promise<string | null> {
  try {
    const res = await fetch(
      'https://cloudflare-dns.com/dns-json?name=wc26.live&type=TXT',
      { headers: { Accept: 'application/dns-json' }, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const answer of data.Answer ?? []) {
      const txt: string = (answer.data ?? '').replace(/"/g, '');
      const m = txt.match(/mirror=(https?:\/\/[^\s]+)/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const origins =
    typeof window !== 'undefined'
      ? [
          process.env.NEXT_PUBLIC_BACKEND_URL,
          window.location.origin,
          ...getStoredMirrors(),
          ...FALLBACK_MIRRORS,
        ].filter((origin): origin is string => Boolean(origin))
      : [SERVER_BACKEND_URL];

  const seen = new Set<string>();
  for (const origin of origins) {
    if (seen.has(origin)) continue;
    seen.add(origin);
    try {
      const res = await fetchWithTimeout(`${origin}${path}`, options);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();

      // If this was a fallback origin, update stored mirrors
      if (origin !== (typeof window !== 'undefined' ? window.location.origin : '')) {
        storeMirrors([origin, ...getStoredMirrors().filter((m) => m !== origin)].slice(0, 5));
      }

      // Cache mirrors list if this was the /api/mirrors endpoint
      if (path === '/api/mirrors' && data.mirrors) {
        const domains: string[] = data.mirrors.map((m: { domain: string }) => `https://${m.domain}`);
        storeMirrors(domains);
      }

      return data as T;
    } catch {
      continue;
    }
  }

  // All known mirrors failed — try DNS TXT discovery via DoH as last resort
  if (typeof window !== 'undefined') {
    const dnsOrigin = await discoverMirrorViaDns();
    if (dnsOrigin && !seen.has(dnsOrigin)) {
      try {
        const res = await fetchWithTimeout(`${dnsOrigin}${path}`, options);
        if (res.ok) {
          const data = await res.json();
          storeMirrors([dnsOrigin, ...getStoredMirrors()].slice(0, 5));
          return data as T;
        }
      } catch {}
    }
  }

  throw new Error('All mirrors unreachable');
}

// ── Typed helpers ────────────────────────────────────────────────────────────

export interface Team {
  id: number;
  code: string;
  name_en: string;
  name_ru: string;
  flag_url: string;
  group_id?: number;
}

export interface Match {
  id: number;
  stage: string;
  venue: string;
  city: string;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'half_time' | 'finished' | 'postponed';
  home_score: number;
  away_score: number;
  minute?: number;
  home_team?: Team;
  away_team?: Team;
  streams?: Stream[];
  stream_redirect_url?: string;
}

export interface MatchEvent {
  id: number;
  match_id: number;
  minute: number;
  type: 'goal' | 'own_goal' | 'yellow_card' | 'red_card' | 'substitution';
  team: 'home' | 'away';
  player_name: string;
  detail: string;
}

export interface MatchLineup {
  id: number;
  match_id: number;
  team: 'home' | 'away';
  player_name: string;
  number: number;
  position: string;
  is_starter: boolean;
}

export interface FormResult {
  result: 'W' | 'D' | 'L';
  score: string;
  stage: string;
  is_home: boolean;
}

export interface H2HMeeting {
  scheduled_at: string;
  home_score: number;
  away_score: number;
  stage: string;
  status: string;
  winner: 'home' | 'away' | 'draw';
}

export interface H2HStats {
  home_wins: number;
  away_wins: number;
  draws: number;
  total: number;
  home_goals: number;
  away_goals: number;
  meetings: H2HMeeting[];
}

export interface MatchStats {
  events: MatchEvent[];
  lineups: MatchLineup[];
  h2h: H2HStats;
  home_form: FormResult[];
  away_form: FormResult[];
}

export interface Stream {
  id: number;
  match_id: number;
  url: string;
  source_type: 'hls' | 'iframe';
  label: string;
  language_code: string;
  region: string;
  quality: string;
  commentary_type: string;
  is_active: boolean;
  priority: number;
}

export interface Group {
  id: number;
  name: string;
  teams: Standing[];
}

export interface Standing {
  id: number;
  code: string;
  name_en: string;
  name_ru: string;
  flag_url: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface Mirror {
  id: number;
  domain: string;
  is_active: boolean;
  is_primary: boolean;
  health_status: string;
}

export const api = {
  matches: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiFetch<{ matches: Match[]; total: number }>(`/api/matches${qs}`);
    },
    get: (id: number, lang?: string, region?: string) => {
      const qs = new URLSearchParams();
      if (lang) qs.set('lang', lang);
      if (region) qs.set('region', region);
      return apiFetch<Match>(`/api/matches/${id}${qs.toString() ? '?' + qs : ''}`);
    },
  },
  stats: {
    get: (id: number) => apiFetch<MatchStats>(`/api/matches/${id}/stats`),
  },
  groups: {
    list: () => apiFetch<{ groups: Group[] }>('/api/groups'),
    get: (id: number) => apiFetch<{ group: Group; standings: Standing[] }>(`/api/groups/${id}`),
  },
  mirrors: {
    list: () => apiFetch<{ mirrors: Mirror[] }>('/api/mirrors'),
  },
};
