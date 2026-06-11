import Link from 'next/link';
import { api, type Match } from '@/lib/api';
import FlagDisplay from '@/components/match/FlagDisplay';
import { getTranslations } from 'next-intl/server';
import NewsCarousel from '@/components/news/NewsCarousel';
import { fetchNewsList } from '@/lib/news';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getMatches(status?: string): Promise<Match[] | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const params: Record<string, string> = status ? { status } : { date: today };
    const res = await api.matches.list(params);
    return res.matches ?? [];
  } catch {
    return null;
  }
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function AdSlot({
  label,
  size,
  className = '',
}: {
  label: string;
  size: string;
  className?: string;
}) {
  return (
    <aside
      aria-label={label}
      className={`relative overflow-hidden rounded-lg border ${className}`}
      style={{
        background:
          'linear-gradient(135deg, rgba(246,196,0,0.12), rgba(18,18,18,0.96) 42%, rgba(246,196,0,0.08))',
        borderColor: 'rgba(246,196,0,0.34)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(246,196,0,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(246,196,0,0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.28,
        }}
      />
      <div className="relative flex h-full min-h-[90px] items-center justify-center px-5 py-4 text-center">
        <div>
          <div className="text-[11px] font-black uppercase" style={{ color: 'var(--primary)' }}>
            {label}
          </div>
          <div className="mt-1 font-display text-2xl font-black" style={{ color: 'var(--text-hi)' }}>
            {size}
          </div>
        </div>
      </div>
    </aside>
  );
}

function HomeMatchRow({
  match,
  locale,
  labels,
}: {
  match: Match;
  locale: string;
  labels: {
    versus: string;
    liveCta: string;
    detailsCta: string;
    inPlay: string;
    halfTime: string;
    tbd: string;
    stages: Record<string, string>;
  };
}) {
  const nameKey = locale === 'ru' ? 'name_ru' : 'name_en';
  const homeName = match.home_team?.[nameKey] ?? labels.tbd;
  const awayName = match.away_team?.[nameKey] ?? labels.tbd;
  const homeFlag = match.home_team?.flag_url ?? '🏳';
  const awayFlag = match.away_team?.flag_url ?? '🏳';
  const isLive = match.status === 'live' || match.status === 'half_time';

  return (
    <Link
      href={`/${locale}/matches/${match.id}`}
      className="group grid gap-4 rounded-lg border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 md:grid-cols-[150px_1fr_90px_1fr_120px_140px] md:items-center md:px-7"
      style={{
        background: 'linear-gradient(180deg, rgba(17,19,17,0.96), rgba(11,13,12,0.98))',
        borderColor: 'rgba(255,255,255,0.12)',
      }}
    >
      <div className="font-score text-sm uppercase md:text-left" style={{ color: 'var(--text-hi)' }}>
        <div className="font-black" style={{ color: 'var(--primary)' }}>
          {formatDate(match.scheduled_at, locale)}
        </div>
        <div className="mt-0.5 text-xs font-semibold" style={{ color: 'var(--text-hi)' }}>
          {formatTime(match.scheduled_at, locale)}
        </div>
      </div>

      {/* Flags are pinned to the inner edges so each side forms a vertical column. */}
      <div className="flex min-w-0 items-center justify-end gap-2.5">
        <span
          className="min-w-0 text-right font-black uppercase leading-tight"
          style={{
            color: 'var(--text-hi)',
            fontSize: 'clamp(0.65rem, 1.5cqi, 0.875rem)',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {homeName}
        </span>
        <FlagDisplay src={homeFlag} name={homeName} size="sm" className="shrink-0 self-center" />
      </div>

      <div className="font-display text-xl font-black uppercase md:text-center" style={{ color: 'var(--primary)' }}>
        {labels.versus}
      </div>

      <div className="flex min-w-0 items-center justify-start gap-2.5">
        <FlagDisplay src={awayFlag} name={awayName} size="sm" className="shrink-0 self-center" />
        <span
          className="min-w-0 text-left font-black uppercase leading-tight"
          style={{
            color: 'var(--text-hi)',
            fontSize: 'clamp(0.65rem, 1.5cqi, 0.875rem)',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {awayName}
        </span>
      </div>

      <div className="text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
        {isLive ? (
          <span
            className="inline-flex min-h-9 items-center gap-2 rounded-md border px-3 font-black"
            style={{
              borderColor: 'rgba(255,95,87,0.36)',
              background: 'rgba(255,95,87,0.10)',
              color: 'var(--live)',
            }}
          >
            <span className="live-dot inline-block h-2 w-2 rounded-full" style={{ background: 'var(--live)' }} />
            {match.status === 'half_time' ? labels.halfTime : labels.inPlay}
          </span>
        ) : (
          labels.stages[match.stage] ?? match.stage.replace(/_/g, ' ').toUpperCase()
        )}
      </div>

      <div
        className="inline-flex min-h-10 items-center justify-center rounded-md border px-4 text-xs font-black uppercase transition-colors group-hover:bg-[var(--primary)] group-hover:text-black"
        style={{
          borderColor: 'var(--primary)',
          color: 'var(--primary)',
        }}
      >
        {isLive ? labels.liveCta : labels.detailsCta}
      </div>
    </Link>
  );
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const tHome = await getTranslations({ locale, namespace: 'home' });
  const tAds = await getTranslations({ locale, namespace: 'ads' });
  const tMatch = await getTranslations({ locale, namespace: 'match' });
  const [liveMatchResult, halfTimeMatchResult, todayMatchResult, scheduledMatchResult, newsItems] = await Promise.all([
    getMatches('live'),
    getMatches('half_time'),
    getMatches(),
    getMatches('scheduled'),
    fetchNewsList().catch(() => []),
  ]);
  const matchApiUnavailable = [liveMatchResult, halfTimeMatchResult, todayMatchResult, scheduledMatchResult].every(
    (result) => result === null,
  );
  const liveMatches = liveMatchResult ?? [];
  const halfTimeMatches = halfTimeMatchResult ?? [];
  const todayMatches = todayMatchResult ?? [];
  const scheduledMatches = scheduledMatchResult ?? [];
  const liveNow = [...liveMatches, ...halfTimeMatches];
  const todayUpcoming = todayMatches.filter((m) => m.status === 'scheduled');
  const upcomingPool = todayUpcoming.length > 0 ? todayUpcoming : scheduledMatches;
  const liveIds = new Set(liveNow.map((m) => m.id));
  const upcoming = upcomingPool.filter((m) => !liveIds.has(m.id)).slice(0, 4);
  const featuredMatches = [...liveNow, ...upcoming].slice(0, 6);
  const emptyMatchesMessage = matchApiUnavailable
    ? tHome('noMatchesApi')
    : tHome('noMatchesToday');
  const stageLabels = {
    group: tMatch('stages.group'),
    round_of_32: tMatch('stages.round_of_32'),
    round_of_16: tMatch('stages.round_of_16'),
    quarter: tMatch('stages.quarter'),
    semi: tMatch('stages.semi'),
    third_place: tMatch('stages.third_place'),
    final: tMatch('stages.final'),
  };

  return (
    <div className="space-y-9">
      <AdSlot label={tAds('label')} size="970 x 90" className="min-h-[90px]" />

      <section
        className="relative min-h-[620px] overflow-hidden rounded-lg border"
        style={{
          borderColor: 'rgba(246,196,0,0.18)',
          backgroundColor: '#050706',
          backgroundImage:
            'linear-gradient(90deg, rgba(4,6,6,0.98) 0%, rgba(4,6,6,0.84) 34%, rgba(4,6,6,0.34) 69%, rgba(4,6,6,0.82) 100%), linear-gradient(180deg, rgba(246,196,0,0.08), rgba(2,3,3,0.94)), url("/images/world-cup-hero.png")',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, var(--primary), transparent)' }}
        />
        <div className="relative grid min-h-[620px] gap-8 p-6 md:grid-cols-[minmax(0,1fr)_300px] md:p-10 lg:p-14">
          <div className="flex max-w-2xl flex-col justify-center">
            <div className="mb-8">
              <div className="text-sm font-black uppercase" style={{ color: 'var(--primary)' }}>
                {tHome('roadToGlory')}
              </div>
              <div className="mt-4 h-0.5 w-16" style={{ background: 'var(--primary)' }} />
            </div>

            <h1
              className="font-display text-5xl font-black uppercase leading-none md:text-7xl"
              style={{ color: 'var(--text-hi)' }}
            >
              {tHome('heroTitleLine1')}
              <br />
              <span style={{ color: 'var(--primary)' }}>{tHome('heroTitleAccent')}</span>
              <br />
              {tHome('heroTitleLine3')}
            </h1>

            <p className="mt-8 max-w-lg text-base font-semibold md:text-lg" style={{ color: 'rgba(246,243,234,0.82)' }}>
              {tHome('heroBody')}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/schedule`}
                className="btn-primary inline-flex min-h-14 items-center rounded-md px-6 text-sm font-black uppercase"
              >
                {tHome('matchCenter')}
              </Link>
              <Link
                href={`/${locale}/groups`}
                className="inline-flex min-h-14 items-center rounded-md border px-6 text-sm font-black uppercase"
                style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'var(--text-hi)' }}
              >
                {tHome('groups')}
              </Link>
            </div>

            <div className="mt-16 flex items-center gap-4">
              <div
                className="flex h-14 w-10 items-center justify-center rounded-full border text-xl font-black"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                26
              </div>
              <div>
                <div className="font-display text-sm font-black uppercase" style={{ color: 'var(--text-hi)' }}>
                  {tHome('heroTitleAccent')}
                </div>
                <div className="text-xs font-black uppercase" style={{ color: 'var(--primary)' }}>
                  {tHome('tournamentDates')}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:justify-end">
            <AdSlot label={tAds('label')} size="300 x 250" className="hidden min-h-[250px] md:block" />
            <AdSlot label={tAds('label')} size="336 x 280" className="min-h-[220px] md:hidden" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-black uppercase md:text-4xl" style={{ color: 'var(--text-hi)' }}>
                {tHome('featuredTitle')} <span style={{ color: 'var(--primary)' }}>{tHome('featuredTitleAccent')}</span>
              </h2>
              <div className="mt-3 h-0.5 w-16" style={{ background: 'var(--primary)' }} />
            </div>
            <Link href={`/${locale}/schedule`} className="text-sm font-black uppercase" style={{ color: 'var(--primary)' }}>
              {tHome('viewFullSchedule')}
            </Link>
          </div>

          {featuredMatches.length > 0 ? (
            <div className="space-y-3">
              {featuredMatches.map((match, i) => (
                <div key={match.id} className="fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                  <HomeMatchRow
                    match={match}
                    locale={locale}
                    labels={{
                      versus: tMatch('versus'),
                      liveCta: tHome('matchCenter'),
                      detailsCta: tHome('matchDetails'),
                      inPlay: tMatch('inPlay'),
                      halfTime: tMatch('halfTime'),
                      tbd: tMatch('tbd'),
                      stages: stageLabels,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-lg border px-6 py-14 text-center"
              style={{ borderColor: 'var(--outline-subtle)', color: 'var(--text-mid)' }}
            >
              {emptyMatchesMessage}
            </div>
          )}
        </div>

        <div className="hidden space-y-4 lg:block">
          <AdSlot label={tAds('label')} size="300 x 250" className="min-h-[250px]" />
          <AdSlot label={tAds('label')} size="300 x 600" className="min-h-[360px] lg:min-h-[600px]" />
        </div>
      </section>

      <NewsCarousel items={newsItems} locale={locale} />

      <AdSlot label={tAds('label')} size="970 x 250" className="min-h-[180px] md:min-h-[250px]" />

      <section
        className="overflow-hidden rounded-lg border px-6 py-8 md:px-10"
        style={{
          borderColor: 'rgba(246,196,0,0.28)',
          background:
            'linear-gradient(105deg, rgba(14,16,15,0.98), rgba(14,16,15,0.92) 52%, rgba(246,196,0,0.22))',
        }}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="font-display text-2xl font-black uppercase md:text-3xl" style={{ color: 'var(--text-hi)' }}>
            {tHome('followTitle')}
            <br />
            <span style={{ color: 'var(--primary)' }}>{tHome('followAccent')}</span>
          </div>
          <Link
            href={`/${locale}/schedule`}
            className="btn-primary inline-flex min-h-12 items-center justify-center rounded-md px-6 text-sm font-black uppercase"
          >
            {tHome('viewFullSchedule')}
          </Link>
        </div>
      </section>
    </div>
  );
}
