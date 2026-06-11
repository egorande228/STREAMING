'use client';

import { useEffect, useState } from 'react';
import type { Match } from '@/lib/api';
import { api } from '@/lib/api';
import { ReconnectingWS } from '@/lib/ws';
import LiveCountdown from '@/components/match/LiveCountdown';
import FlagDisplay from '@/components/match/FlagDisplay';
import MatchStatsView from '@/components/match/MatchStatsView';
import { useTranslations } from 'next-intl';

interface Props {
  match: Match;
  locale: string;
  lang?: string;
  region?: string;
}

interface ScoreUpdateMessage {
  type?: string;
  match_id?: number;
  home_score?: number;
  away_score?: number;
  minute?: number;
  status?: Match['status'];
}

export default function MatchLiveView({ match, locale, lang, region }: Props) {
  const tMatch = useTranslations('match');
  const [status,    setStatus]    = useState<Match['status']>(match.status);
  const [homeScore, setHomeScore] = useState(match.home_score);
  const [awayScore, setAwayScore] = useState(match.away_score);
  const [minute,    setMinute]    = useState<number | undefined>(match.minute);

  useEffect(() => {
    setStatus(match.status);
    setHomeScore(match.home_score);
    setAwayScore(match.away_score);
    setMinute(match.minute);
  }, [match.id, match.status, match.home_score, match.away_score, match.minute]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ws = new ReconnectingWS(`${window.location.origin}/api/ws/live`, (data) => {
      const msg = data as ScoreUpdateMessage;
      if (msg.type !== 'score_update' || msg.match_id !== match.id) return;
      if (typeof msg.home_score === 'number') setHomeScore(msg.home_score);
      if (typeof msg.away_score === 'number') setAwayScore(msg.away_score);
      if (typeof msg.minute    === 'number') setMinute(msg.minute);
      if (msg.status) setStatus(msg.status);
    });
    return () => ws.close();
  }, [match.id]);

  const defaultStreamBase = process.env.NEXT_PUBLIC_STREAM_SITE_URL ?? 'http://localhost:3100';
  const [streamBase, setStreamBase] = useState(defaultStreamBase);

  useEffect(() => {
    api.mirrors.list().then(({ mirrors }) => {
      const primary = mirrors.find((m) => m.is_primary && m.health_status === 'healthy' && m.is_active)
        ?? mirrors.find((m) => m.is_active && m.health_status === 'healthy');
      if (primary) setStreamBase(`https://${primary.domain}`);
    }).catch(() => {});
  }, []);

  const nameKey  = locale === 'ru' ? 'name_ru' : 'name_en';
  const homeName = match.home_team?.[nameKey] ?? tMatch('tbd');
  const awayName = match.away_team?.[nameKey] ?? tMatch('tbd');
  const homeFlag = match.home_team?.flag_url ?? '🏳';
  const awayFlag = match.away_team?.flag_url ?? '🏳';
  const isLive   = status === 'live' || status === 'half_time';
  const streamQuery = new URLSearchParams();
  streamQuery.set('id', String(match.id));
  if (lang) streamQuery.set('lang', lang);
  if (region) streamQuery.set('region', region);
  const streamHref = `${streamBase}/${locale}/embed?${streamQuery}`;

  return (
    <div className="space-y-6">

      {/* Score card */}
      <div
        className="panel-sheen rounded-[30px] p-6 md:p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(14,14,14,0.98), rgba(9,9,9,0.98))',
          border: `1px solid ${isLive ? 'var(--live)' : 'var(--outline-subtle)'}`,
          boxShadow: isLive ? '0 22px 50px rgba(255, 95, 87, 0.10)' : '0 18px 40px rgba(0,0,0,0.22)',
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(var(--outline-dim) 1px, transparent 1px),
              linear-gradient(90deg, var(--outline-dim) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
          }}
        />

        <div className="relative flex items-center justify-between gap-4 md:gap-8">
          {/* Home team */}
          <div className="flex-1 text-center md:text-right">
            <div className="mb-3 flex justify-center md:justify-end">
              <FlagDisplay src={homeFlag} name={homeName} size="xl" />
            </div>
            <div
              className="font-bold leading-tight"
              style={{
                color: 'var(--text-hi)',
                fontSize: 'clamp(0.8rem, 3.5vw, 1.5rem)',
                wordBreak: 'break-word',
              }}
            >
              {homeName}
            </div>
          </div>

          {/* Score / time */}
          <div className="text-center shrink-0 px-2">
            {(isLive || status === 'finished') ? (
              <>
                <div
                  className="font-score text-4xl md:text-5xl font-medium tabular-nums"
                  style={{ color: 'var(--primary)' }}
                >
                  {homeScore}
                  <span
                    className="mx-2 text-3xl md:text-4xl"
                    style={{ color: 'var(--text-lo)' }}
                  >
                    –
                  </span>
                  {awayScore}
                </div>
                {isLive && (
                  <div
                    className="mt-2 flex items-center justify-center gap-1.5"
                    style={{ color: 'var(--live)' }}
                  >
                    <span className="live-dot w-1.5 h-1.5 rounded-full" style={{ background: 'var(--live)' }} />
                    <span className="font-score text-xs font-medium">
                      {status === 'half_time' ? tMatch('halfTime') : `${minute ?? 0}'`}
                    </span>
                  </div>
                )}
                {status === 'finished' && (
                  <div
                    className="mt-2 font-score text-[11px] tracking-widest uppercase"
                    style={{ color: 'var(--text-lo)' }}
                  >
                    {tMatch('fullTime')}
                  </div>
                )}
              </>
            ) : (
              <div>
                <div
                  className="font-score text-2xl tracking-widest"
                  style={{ color: 'var(--text-lo)' }}
                >
                  ·–·
                </div>
                <div className="mt-2 text-xs" style={{ color: 'var(--text-mid)' }}>
                  {new Date(match.scheduled_at).toLocaleString(locale, {
                    month: 'short',
                    day:   'numeric',
                    hour:  '2-digit',
                    minute:'2-digit',
                  })}
                </div>
                <LiveCountdown
                  scheduledAt={match.scheduled_at}
                  className="font-score text-xs mt-0.5"
                  style={{ color: 'var(--primary)' }}
                  startingNowLabel={tMatch('startingNow')}
                />
              </div>
            )}
          </div>

          {/* Away team */}
          <div className="flex-1 text-center md:text-left">
            <div className="mb-3 flex justify-center md:justify-start">
              <FlagDisplay src={awayFlag} name={awayName} size="xl" />
            </div>
            <div
              className="font-bold leading-tight"
              style={{
                color: 'var(--text-hi)',
                fontSize: 'clamp(0.8rem, 3.5vw, 1.5rem)',
                wordBreak: 'break-word',
              }}
            >
              {awayName}
            </div>
          </div>
        </div>

        {match.venue && (
          <p
            className="relative mt-5 text-xs text-center tracking-wide"
            style={{ color: 'var(--text-lo)' }}
          >
            {match.venue}, {match.city}
          </p>
        )}
      </div>


      {isLive && (
        <a
          href={streamHref}
          className="flex w-full items-center justify-center gap-3 rounded-[20px] py-4 text-sm font-black uppercase tracking-wide transition-all hover:opacity-90 active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, var(--live) 0%, rgba(220,38,38,0.8) 100%)',
            color: '#000',
            boxShadow: '0 8px 32px rgba(239,68,68,0.3)',
          }}
        >
          <span className="flex h-2 w-2 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          {locale === 'ru' ? 'Подробнее' : 'Coverage'}
        </a>
      )}

      <MatchStatsView match={match} locale={locale} />
    </div>
  );
}
