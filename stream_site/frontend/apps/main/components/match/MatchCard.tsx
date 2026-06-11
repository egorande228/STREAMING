import Link from 'next/link';
import type { Match } from '@/lib/api';
import LiveCountdown from '@/components/match/LiveCountdown';
import FlagDisplay from '@/components/match/FlagDisplay';

interface MatchCardLabels {
  tbd: string;
  halfTime: string;
  fullTime: string;
  versus: string;
  startingNow: string;
}

interface Props {
  match: Match;
  locale?: string;
  labels?: MatchCardLabels;
}

function formatTime(iso: string, locale = 'en') {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export default function MatchCard({ match, locale = 'en', labels }: Props) {
  const isLive     = match.status === 'live' || match.status === 'half_time';
  const isFinished = match.status === 'finished';
  const nameKey = locale === 'ru' ? 'name_ru' : 'name_en';
  const ui = labels ?? {
    tbd: 'TBD', halfTime: 'HT', fullTime: 'FT',
    versus: 'vs', startingNow: 'Starting now',
  };

  const homeName  = match.home_team?.[nameKey] ?? ui.tbd;
  const awayName  = match.away_team?.[nameKey] ?? ui.tbd;
  const homeFlag  = match.home_team?.flag_url  ?? '🏳';
  const awayFlag  = match.away_team?.flag_url  ?? '🏳';
  const stageName = match.stage.replace(/_/g, ' ');

  return (
    <Link
      href={`/${locale}/matches/${match.id}`}
      scroll
      className={[
        'block group rounded-[24px] overflow-hidden transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-xl',
        isLive ? 'live-card' : '',
      ].join(' ')}
      style={{
        background: 'linear-gradient(180deg, rgba(21,21,21,0.98), rgba(13,13,13,0.98))',
        border: '1px solid var(--outline-subtle)',
        opacity:    isFinished ? 0.6 : 1,
      }}
    >
      {/* Top meta: stage + venue */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2"
        style={{ borderBottom: '1px solid var(--outline-dim)' }}
      >
        <span
          className="text-[11px] font-extrabold uppercase tracking-[0.18em]"
          style={{ color: isLive ? 'var(--secondary)' : 'var(--primary)', fontFamily: 'var(--font-body)' }}
        >
          {isLive && (
            <span className="inline-flex items-center gap-1 mr-2">
              <span className="live-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--secondary)' }} />
              {match.status === 'half_time' ? ui.halfTime : `${match.minute ?? 0}'`}
            </span>
          )}
          {stageName}
        </span>
        <span
          className="text-[11px] font-medium"
          style={{ color: 'var(--text-lo)', fontFamily: 'var(--font-body)' }}
        >
          {match.city ?? ''}
        </span>
      </div>

      {/* Main: flag | center | flag */}
      <div className="flex items-center justify-between px-5 py-5">

        {/* Home team */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <FlagDisplay src={homeFlag} name={homeName} size="lg" />
          <span
            className="text-xs font-bold uppercase tracking-widest text-center truncate w-full"
            style={{ color: 'var(--text-hi)', fontFamily: 'var(--font-body)' }}
          >
            {homeName}
          </span>
        </div>

        {/* Center: score or time */}
        <div className="flex flex-col items-center justify-center gap-1 px-4 shrink-0 min-w-[80px]">
          {(isLive || isFinished) ? (
            <>
              <div
                className="font-display font-bold tabular-nums"
                style={{
                  fontSize:   '2rem',
                  lineHeight: '1',
                  color:      isLive ? 'var(--primary)' : 'var(--text-hi)',
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: isLive ? '0 0 24px rgba(246, 196, 0, 0.18)' : 'none',
                }}
              >
                {match.home_score}
                <span className="mx-1.5 font-light" style={{ opacity: 0.4 }}>:</span>
                {match.away_score}
              </div>
              {isFinished && (
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-lo)', fontFamily: 'var(--font-body)' }}
                >
                  {ui.fullTime}
                </span>
              )}
            </>
          ) : (
            <>
              <div
                className="font-display font-bold"
                style={{ fontSize: '1.75rem', lineHeight: '1', color: 'var(--primary)' }}
              >
                {formatTime(match.scheduled_at, locale)}
              </div>
              <LiveCountdown
                scheduledAt={match.scheduled_at}
                className="text-[11px] font-semibold text-center"
                style={{ color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}
                startingNowLabel={ui.startingNow}
              />
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <FlagDisplay src={awayFlag} name={awayName} size="lg" />
          <span
            className="text-xs font-bold uppercase tracking-widest text-center truncate w-full"
            style={{ color: 'var(--text-hi)', fontFamily: 'var(--font-body)' }}
          >
            {awayName}
          </span>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="px-4 pb-3">
        <div
          className={[
            'w-full py-2.5 rounded-xl text-center text-xs font-extrabold uppercase tracking-[0.18em] transition-all duration-200',
            isLive
              ? 'btn-primary group-hover:opacity-90'
              : 'group-hover:bg-[var(--bg-highest)]',
          ].join(' ')}
          style={
            isLive
              ? {}
              : {
                  background: 'var(--bg-bright)',
                  color:      'var(--text-hi)',
                  border: '1px solid var(--outline-subtle)',
                  fontFamily: 'var(--font-body)',
                }
          }
        >
          {isLive ? 'Match Center' : isFinished ? 'Match Report' : 'Match Details'}
          <span className="ml-1.5 opacity-70">→</span>
        </div>
      </div>
    </Link>
  );
}
