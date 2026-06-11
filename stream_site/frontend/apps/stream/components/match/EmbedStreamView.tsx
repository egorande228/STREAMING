'use client';

import { useTranslations } from 'next-intl';
import type { Match } from '@/lib/api';
import LiveCountdown from '@/components/match/LiveCountdown';
import VideoPlayer from '@/components/player/VideoPlayer';

interface Props {
  match: Match;
  locale: string;
  lang: string;
  region: string;
}

export default function EmbedStreamView({ match, locale, lang, region }: Props) {
  const tMatch = useTranslations('match');
  const tStream = useTranslations('streamPage');

  const nameKey = locale === 'ru' ? 'name_ru' : 'name_en';
  const homeName = match.home_team?.[nameKey] ?? tMatch('tbd');
  const awayName = match.away_team?.[nameKey] ?? tMatch('tbd');
  const isLive = match.status === 'live' || match.status === 'half_time';
  const activeStreams = (match.streams ?? []).filter((stream) => stream.is_active);

  return (
    <main className="min-h-screen bg-black text-white">
      {isLive && activeStreams.length > 0 ? (
        <div className="h-screen w-screen overflow-hidden bg-black">
          <VideoPlayer streams={activeStreams} preferredLang={lang} preferredRegion={region} compact />
        </div>
      ) : (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
          <div className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: 'var(--primary)' }}>
            {match.status === 'finished' ? tMatch('fullTime') : tMatch('scheduled')}
          </div>
          <h1 className="font-display text-2xl font-black uppercase leading-tight md:text-4xl">
            {homeName} <span style={{ color: 'var(--primary)' }}>{tMatch('versus')}</span> {awayName}
          </h1>
          <p className="max-w-md text-sm font-semibold" style={{ color: 'var(--text-mid)' }}>
            {match.status === 'finished' ? tStream('matchFinished') : tStream('videoBeforeKickoff')}
          </p>
          {match.status !== 'finished' && (
            <LiveCountdown
              scheduledAt={match.scheduled_at}
              className="font-score text-sm font-black"
              style={{ color: 'var(--primary)' }}
              startingNowLabel={tMatch('startingNow')}
            />
          )}
        </div>
      )}
    </main>
  );
}
