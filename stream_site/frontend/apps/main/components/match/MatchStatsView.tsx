'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api, type MatchStats, type Match } from '@/lib/api';

type Tab = 'overview' | 'events' | 'lineups';

const EVENT_ICONS: Record<string, string> = {
  goal: '⚽',
  own_goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  substitution: '🔄',
};

const FORM_COLORS: Record<string, { bg: string; color: string }> = {
  W: { bg: 'rgba(34,197,94,0.2)', color: '#4ade80' },
  D: { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-mid)' },
  L: { bg: 'rgba(239,68,68,0.18)', color: '#f87171' },
};

const POS_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

function FormBadge({ result }: { result: string }) {
  const style = FORM_COLORS[result] ?? FORM_COLORS.D;
  return (
    <span
      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}33` }}
    >
      {result}
    </span>
  );
}

function StatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away || 1;
  const homePct = Math.round((home / total) * 100);
  const awayPct = 100 - homePct;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>
        <span style={{ color: 'var(--text-hi)' }}>{home}</span>
        <span className="uppercase tracking-wide">{label}</span>
        <span style={{ color: 'var(--text-hi)' }}>{away}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-l-full" style={{ width: `${homePct}%`, background: 'var(--primary)' }} />
        <div className="h-full rounded-r-full" style={{ width: `${awayPct}%`, background: 'rgba(255,255,255,0.25)' }} />
      </div>
    </div>
  );
}

export default function MatchStatsView({ match, locale }: { match: Match; locale: string }) {
  const tStats = useTranslations('matchStats');
  const tMatch = useTranslations('match');
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  const nameKey = locale === 'ru' ? 'name_ru' : 'name_en';
  const homeName = match.home_team?.[nameKey] ?? tMatch('tbd');
  const awayName = match.away_team?.[nameKey] ?? tMatch('tbd');

  useEffect(() => {
    api.stats.get(match.id)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [match.id]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: tStats('overview') },
    { id: 'events', label: tStats('events') },
    { id: 'lineups', label: tStats('lineups') },
  ];

  const hasEvents = stats && stats.events.length > 0;
  const hasLineups = stats && stats.lineups.length > 0;
  const hasH2H = stats && stats.h2h.total > 0;

  const homeLineup = stats?.lineups.filter((p) => p.team === 'home').sort((a, b) => (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9)) ?? [];
  const awayLineup = stats?.lineups.filter((p) => p.team === 'away').sort((a, b) => (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9)) ?? [];

  return (
    <div
      className="overflow-hidden rounded-[24px] border"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--outline-subtle)' }}
    >
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'var(--outline-subtle)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 px-4 py-3 text-xs font-black uppercase tracking-wide transition-colors"
            style={
              tab === t.id
                ? { color: 'var(--primary)', borderBottom: '2px solid var(--primary)' }
                : { color: 'var(--text-mid)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {loading && (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {/* OVERVIEW TAB */}
        {!loading && tab === 'overview' && (
          <div className="space-y-6">
            {/* Match info */}
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              {match.venue && (
                <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="mb-1 font-black uppercase" style={{ color: 'var(--primary)' }}>{tStats('venue')}</div>
                  <div style={{ color: 'var(--text-hi)' }}>{match.venue}</div>
                  {match.city && <div style={{ color: 'var(--text-mid)' }}>{match.city}</div>}
                </div>
              )}
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="mb-1 font-black uppercase" style={{ color: 'var(--primary)' }}>{tStats('stage')}</div>
                <div style={{ color: 'var(--text-hi)' }}>{tMatch(`stages.${match.stage}`)}</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="mb-1 font-black uppercase" style={{ color: 'var(--primary)' }}>{tStats('kickoff')}</div>
                <div style={{ color: 'var(--text-hi)' }}>
                  {new Date(match.scheduled_at).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* H2H */}
            {hasH2H && (
              <div>
                <h3 className="mb-3 text-xs font-black uppercase" style={{ color: 'var(--primary)' }}>
                  {tStats('headToHead', { count: stats.h2h.total })}
                </h3>
                <StatBar label={tStats('wins', { team: homeName })} home={stats.h2h.home_wins} away={stats.h2h.away_wins} />
                <div className="mt-2">
                  <StatBar label={tStats('goals')} home={stats.h2h.home_goals} away={stats.h2h.away_goals} />
                </div>
                <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--text-mid)' }}>
                  <span>{tStats('draws', { count: stats.h2h.draws })}</span>
                  <span>{awayName}</span>
                </div>

                {stats.h2h.meetings.slice(0, 5).length > 0 && (
                  <div className="mt-3 space-y-2">
                    {stats.h2h.meetings.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-center justify-between rounded px-3 py-2 text-xs" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <span style={{ color: 'var(--text-mid)' }}>{m.scheduled_at}</span>
                        <span
                          className="font-black"
                          style={{ color: m.winner === 'home' ? '#4ade80' : m.winner === 'away' ? '#f87171' : 'var(--text-mid)' }}
                        >
                          {m.home_score} – {m.away_score}
                        </span>
                        <span className="uppercase" style={{ color: 'var(--text-mid)' }}>{tMatch(`stages.${m.stage}`)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!hasH2H && (
              <div className="py-4 text-center text-xs" style={{ color: 'var(--text-mid)' }}>
                {tStats('noMeetings')}
              </div>
            )}

            {/* Form */}
            {((stats?.home_form?.length ?? 0) > 0 || (stats?.away_form?.length ?? 0) > 0) && (
              <div>
                <h3 className="mb-3 text-xs font-black uppercase" style={{ color: 'var(--primary)' }}>{tStats('recentForm')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-24 truncate text-xs font-black uppercase" style={{ color: 'var(--text-hi)' }}>{homeName}</span>
                    <div className="flex gap-1.5">
                      {stats?.home_form.map((f, i) => <FormBadge key={i} result={f.result} />)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-24 truncate text-xs font-black uppercase" style={{ color: 'var(--text-hi)' }}>{awayName}</span>
                    <div className="flex gap-1.5">
                      {stats?.away_form.map((f, i) => <FormBadge key={i} result={f.result} />)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {!loading && tab === 'events' && (
          <div>
            {!hasEvents ? (
              <div className="py-8 text-center text-xs" style={{ color: 'var(--text-mid)' }}>
                {tStats('noEvents')}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.events.map((ev) => (
                  <div
                    key={ev.id}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm ${ev.team === 'home' ? 'flex-row' : 'flex-row-reverse'}`}
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <span className="shrink-0 text-lg">{EVENT_ICONS[ev.type] ?? '•'}</span>
                    <div className={`flex-1 ${ev.team === 'away' ? 'text-right' : ''}`}>
                      <div className="font-black" style={{ color: 'var(--text-hi)' }}>{ev.player_name}</div>
                      {ev.detail && <div className="text-xs" style={{ color: 'var(--text-mid)' }}>{ev.detail}</div>}
                    </div>
                    <span
                      className="shrink-0 font-score text-sm font-black"
                      style={{ color: 'var(--primary)' }}
                    >
                      {ev.minute}&apos;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LINEUPS TAB */}
        {!loading && tab === 'lineups' && (
          <div>
            {!hasLineups ? (
              <div className="py-8 text-center text-xs" style={{ color: 'var(--text-mid)' }}>
                {tStats('lineupsUnavailable')}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: homeName, players: homeLineup },
                  { label: awayName, players: awayLineup },
                ].map(({ label, players }) => (
                  <div key={label}>
                    <div className="mb-2 text-xs font-black uppercase" style={{ color: 'var(--primary)' }}>{label}</div>
                    <div className="space-y-1">
                      {players.filter((p) => p.is_starter).map((p) => (
                        <div key={p.id} className="flex items-center gap-2 rounded px-3 py-1.5 text-xs" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <span className="w-5 text-center font-score font-black" style={{ color: 'var(--primary)' }}>{p.number}</span>
                          <span className="flex-1 font-semibold" style={{ color: 'var(--text-hi)' }}>{p.player_name}</span>
                          <span className="uppercase" style={{ color: 'var(--text-mid)' }}>{p.position}</span>
                        </div>
                      ))}
                      {players.filter((p) => !p.is_starter).length > 0 && (
                        <>
                          <div className="pt-2 text-[10px] uppercase" style={{ color: 'var(--text-mid)' }}>{tStats('substitutes')}</div>
                          {players.filter((p) => !p.is_starter).map((p) => (
                            <div key={p.id} className="flex items-center gap-2 rounded px-3 py-1.5 text-xs" style={{ background: 'rgba(255,255,255,0.03)', opacity: 0.7 }}>
                              <span className="w-5 text-center font-score" style={{ color: 'var(--text-mid)' }}>{p.number}</span>
                              <span className="flex-1" style={{ color: 'var(--text-hi)' }}>{p.player_name}</span>
                              <span className="uppercase" style={{ color: 'var(--text-mid)' }}>{p.position}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
