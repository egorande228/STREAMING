'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Match } from '@/lib/api';
import { ReconnectingWS } from '@/lib/ws';
import ChatPanel from '@/components/chat/ChatPanel';
import FlagDisplay from '@/components/match/FlagDisplay';
import LiveCountdown from '@/components/match/LiveCountdown';
import VideoPlayer from '@/components/player/VideoPlayer';
import TelegramPopup from '@/components/TelegramPopup';
import MirrorGuard from '@/components/MirrorGuard';
import { useTranslations } from 'next-intl';

interface Props {
  match: Match;
  locale: string;
  lang: string;
  region: string;
}

interface ScoreUpdateMessage {
  type?: string;
  match_id?: number;
  home_score?: number;
  away_score?: number;
  minute?: number;
  status?: Match['status'];
}

export default function MatchStreamView({ match, locale, lang, region }: Props) {
  const tMatch = useTranslations('match');
  const tStream = useTranslations('streamPage');
  const tAds = useTranslations('ads');
  const mainBase = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? 'http://localhost:3000';
  const [status, setStatus] = useState<Match['status']>(match.status);
  const [homeScore, setHomeScore] = useState(match.home_score);
  const [awayScore, setAwayScore] = useState(match.away_score);
  const [minute, setMinute] = useState<number | undefined>(match.minute);

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
      if (typeof msg.minute === 'number') setMinute(msg.minute);
      if (msg.status) setStatus(msg.status);
    });
    return () => ws.close();
  }, [match.id]);

  const nameKey = locale === 'ru' ? 'name_ru' : 'name_en';
  const homeName = match.home_team?.[nameKey] ?? tMatch('tbd');
  const awayName = match.away_team?.[nameKey] ?? tMatch('tbd');
  const homeFlag = match.home_team?.flag_url ?? '🏳';
  const awayFlag = match.away_team?.flag_url ?? '🏳';
  const isLive = status === 'live' || status === 'half_time';
  const activeStreams = (match.streams ?? []).filter((s) => s.is_active);
  const hasStreams = activeStreams.length > 0;

  const statusLabel = isLive
    ? status === 'half_time' ? tMatch('halfTime') : tMatch('live')
    : status === 'finished' ? tMatch('fullTime') : tMatch('scheduled');

  return (
    <div
      className="min-h-[calc(100svh-1.5rem)] overflow-hidden rounded-lg border"
      style={{
        background: 'linear-gradient(180deg, rgba(4,5,5,0.99), rgba(7,9,8,0.99))',
        borderColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <header
        className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-6"
        style={{ borderColor: 'var(--outline-subtle)', background: 'rgba(0,0,0,0.34)' }}
      >
        <Link href={`/${locale}/stream/${match.id}?lang=${lang}&region=${region}`} className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-black"
            style={{ background: 'var(--primary)', color: '#090909' }}
          >
            TV
          </span>
          <div className="leading-none">
            <div className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--primary)' }}>
              WC26
            </div>
            <div className="font-display text-lg font-black uppercase" style={{ color: 'var(--text-hi)' }}>
              {tStream('brand')}
            </div>
          </div>
        </Link>

        <nav className="flex flex-wrap gap-2">
          <a
            href={`${mainBase}/${locale}/matches/${match.id}`}
            className="inline-flex min-h-10 items-center rounded-md border px-4 text-xs font-black uppercase"
            style={{ borderColor: 'var(--outline-subtle)', color: 'var(--text-hi)' }}
          >
            {tStream('backToMatch')}
          </a>
          <a
            href={`${mainBase}/${locale}`}
            className="inline-flex min-h-10 items-center rounded-md px-4 text-xs font-black uppercase"
            style={{ background: 'var(--primary)', color: '#090909' }}
          >
            {tStream('mainSite')}
          </a>
        </nav>
      </header>

      <div className="grid min-h-[calc(100svh-5.5rem)] gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 p-3 md:p-5">
          <section
            className="mb-4 grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto_1fr]"
            style={{ borderColor: 'var(--outline-subtle)', background: 'rgba(255,255,255,0.035)' }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <FlagDisplay src={homeFlag} name={homeName} size="md" />
              <span className="truncate font-display text-xl font-black uppercase md:text-2xl" style={{ color: 'var(--text-hi)' }}>
                {homeName}
              </span>
            </div>

            <div className="flex items-center justify-center">
              {(isLive || status === 'finished') ? (
                <div className="text-center">
                  <div className="font-score text-4xl font-black tabular-nums" style={{ color: 'var(--primary)' }}>
                    {homeScore} - {awayScore}
                  </div>
                  <div className="text-[11px] font-black uppercase" style={{ color: isLive ? 'var(--live)' : 'var(--text-lo)' }}>
                    {isLive ? (status === 'half_time' ? tMatch('halfTime') : `${minute ?? 0}'`) : tMatch('fullTime')}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="font-score text-2xl font-black" style={{ color: 'var(--primary)' }}>
                    {new Date(match.scheduled_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <LiveCountdown
                    scheduledAt={match.scheduled_at}
                    className="font-score text-xs"
                    style={{ color: 'var(--text-mid)' }}
                    startingNowLabel={tMatch('startingNow')}
                  />
                </div>
              )}
            </div>

            <div className="flex min-w-0 items-center justify-end gap-3">
              <span className="truncate text-right font-display text-xl font-black uppercase md:text-2xl" style={{ color: 'var(--text-hi)' }}>
                {awayName}
              </span>
              <FlagDisplay src={awayFlag} name={awayName} size="md" />
            </div>
          </section>

          {/* Banner slot — above player */}
          <div
            className="mb-3 flex items-center justify-center rounded-lg"
            style={{
              minHeight: 90,
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.10)',
            }}
            data-ad-slot="stream-top"
          >
            {/* 728×90 leaderboard — replace with ad tag */}
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
              {tAds('label')}
            </span>
          </div>

          {isLive && hasStreams ? (
            <VideoPlayer streams={activeStreams} preferredLang={lang} preferredRegion={region} />
          ) : (
            <div
              className="relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-[24px]"
              style={{
                background: 'linear-gradient(160deg, rgba(10,12,11,0.98) 0%, rgba(6,8,7,0.99) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* grid pattern */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                  backgroundSize: '48px 48px',
                  maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
                }}
              />
              {/* radial glow */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse 60% 50% at 50% 60%, rgba(246,196,0,0.06), transparent 70%)',
                }}
              />

              <div className="relative flex flex-col items-center gap-5 px-8 text-center">
                {/* pulsing ring */}
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-20"
                    style={{ background: 'var(--primary)' }}
                  />
                  <span
                    className="relative flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(246,196,0,0.12)', border: '1.5px solid rgba(246,196,0,0.35)' }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--primary)' }}>
                      <polygon points="5,3 19,12 5,21" fill="currentColor" />
                    </svg>
                  </span>
                </div>

                <div>
                  <div
                    className="font-display text-2xl font-black uppercase md:text-3xl"
                    style={{ color: 'var(--text-hi)' }}
                  >
                    {homeName} <span style={{ color: 'var(--primary)' }}>{tMatch('versus')}</span> {awayName}
                  </div>
                  <div className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-mid)' }}>
                    {status === 'finished' ? tStream('matchFinished') : tStream('videoBeforeKickoff')}
                  </div>
                  {status !== 'finished' && (
                    <LiveCountdown
                      scheduledAt={match.scheduled_at}
                      className="mt-1 font-score text-sm font-black"
                      style={{ color: 'var(--primary)' }}
                      startingNowLabel={tMatch('startingNow')}
                    />
                  )}
                </div>

                {match.stream_redirect_url && (
                  <a
                    href={match.stream_redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl px-6 text-sm font-black uppercase transition-opacity hover:opacity-80"
                    style={{ background: 'var(--primary)', color: '#090909' }}
                  >
                    {tStream('external')} ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Banner slot — below player */}
          <div
            className="mt-3 flex items-center justify-center rounded-lg"
            style={{
              minHeight: 90,
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.10)',
            }}
            data-ad-slot="stream-bottom"
          >
            {/* 728×90 leaderboard — replace with ad tag */}
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
              {tAds('label')}
            </span>
          </div>
        </main>

        <aside
          className="grid min-h-[520px] grid-rows-[auto_minmax(0,1fr)] border-t xl:border-l xl:border-t-0"
          style={{ borderColor: 'var(--outline-subtle)', background: 'rgba(255,255,255,0.025)' }}
        >
          <section className="border-b p-4" style={{ borderColor: 'var(--outline-subtle)' }}>
            <p className="brand-kicker">{tStream('brand')}</p>
            <h1 className="mt-3 font-display text-2xl font-black uppercase" style={{ color: 'var(--text-hi)' }}>
              {homeName} {tMatch('versus')} {awayName}
            </h1>

            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-md px-3 py-2" style={{ background: 'rgba(255,255,255,0.045)' }}>
                <span className="font-black uppercase" style={{ color: 'var(--text-mid)' }}>{tStream('status')}</span>
                <span className="font-score font-black uppercase" style={{ color: isLive ? 'var(--live)' : 'var(--primary)' }}>
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md px-3 py-2" style={{ background: 'rgba(255,255,255,0.045)' }}>
                <span className="font-black uppercase" style={{ color: 'var(--text-mid)' }}>{tStream('matchInfo')}</span>
                <span className="font-score font-black" style={{ color: 'var(--text-hi)' }}>
                  {tMatch(`stages.${match.stage}`)}
                </span>
              </div>
            </div>
          </section>

          <section className="min-h-0 p-3">
            <div className="mb-2 px-1 text-xs font-black uppercase" style={{ color: 'var(--primary)' }}>
              {tStream('chat')}
            </div>
            <div className="h-[470px] min-h-0 xl:h-[calc(100svh-310px)]">
              <ChatPanel matchId={match.id} />
            </div>
          </section>
        </aside>
      </div>

      <TelegramPopup botUrl="https://t.me/" />
      <MirrorGuard />
    </div>
  );
}
