import { api, type Match } from '@/lib/api';
import MatchCard from '@/components/match/MatchCard';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getMatches(status?: string): Promise<Match[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const params: Record<string, string> = status ? { status } : { date: today };
    const res = await api.matches.list(params);
    return res.matches ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const tHome  = await getTranslations({ locale, namespace: 'home' });
  const tMatch = await getTranslations({ locale, namespace: 'match' });
  const [liveMatches, halfTimeMatches, todayMatches] = await Promise.all([
    getMatches('live'),
    getMatches('half_time'),
    getMatches(),
  ]);
  const liveNow  = [...liveMatches, ...halfTimeMatches];
  const upcoming = todayMatches.filter((m) => m.status === 'scheduled');

  const matchLabels = {
    tbd:         tMatch('tbd'),
    halfTime:    tMatch('halfTime'),
    fullTime:    tMatch('finished'),
    versus:      tMatch('versus'),
    startingNow: tMatch('startingNow'),
  };

  return (
    <div className="space-y-10">

      {/* Hero */}
      <div
        className="panel-sheen relative overflow-hidden rounded-[32px] border"
        style={{ background: 'linear-gradient(180deg, rgba(16,16,16,0.98), rgba(10,10,10,0.98))', borderColor: 'var(--outline-subtle)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '54px 54px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          }}
        />
        <div
          className="absolute -right-12 top-0 h-64 w-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'var(--primary-glow)' }}
        />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)' }} />

        <div className="relative grid gap-8 px-6 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-10 md:py-14">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-2xl md:text-3xl">
              <span className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: 'var(--outline-subtle)', color: 'var(--text-mid)' }}>USA</span>
              <span className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: 'var(--outline-subtle)', color: 'var(--text-mid)' }}>CAN</span>
              <span className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: 'var(--outline-subtle)', color: 'var(--text-mid)' }}>MEX</span>
            </div>

            <div className="space-y-3">
              <p className="brand-kicker">World Cup Match Center</p>
              <h1
                className="font-display font-black italic leading-[0.88]"
                style={{ fontSize: 'clamp(3.4rem, 9vw, 7.2rem)', color: 'var(--text-hi)' }}
              >
                ALL MATCHES.
                <br />
                LIVE DAYS.
                <br />
                <span style={{ color: 'var(--primary)' }}>ONE HUB.</span>
              </h1>
              <p className="max-w-2xl text-sm md:text-base" style={{ color: 'var(--text-mid)' }}>
                Follow the tournament through a clean match catalog, live fixtures, group standings and dedicated watch pages built around the games.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`/${locale}/schedule`}
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold transition-transform hover:scale-[1.02]"
              >
                {tHome('viewFullSchedule')}
              </a>
              <a
                href={`/${locale}/groups`}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all"
                style={{
                  background: 'var(--bg-bright)',
                  color: 'var(--text-hi)',
                  border: '1px solid var(--outline-subtle)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {tHome('groups')}
              </a>
            </div>
          </div>

          <div className="grid gap-3 self-end">
            <div className="rounded-3xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--outline-subtle)' }}>
              <p className="brand-kicker mb-3">Today At A Glance</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
                  <div className="text-2xl font-black font-display" style={{ color: 'var(--primary)' }}>{liveNow.length}</div>
                  <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-mid)' }}>Live now</div>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
                  <div className="text-2xl font-black font-display" style={{ color: 'var(--text-hi)' }}>{upcoming.length}</div>
                  <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-mid)' }}>Today</div>
                </div>
                <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
                  <div className="text-2xl font-black font-display" style={{ color: 'var(--secondary)' }}>24/7</div>
                  <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-mid)' }}>Match hub</div>
                </div>
              </div>
            </div>

            <div
              className="rounded-3xl border p-5"
              style={{
                background: 'linear-gradient(180deg, rgba(246,196,0,0.22), rgba(246,196,0,0.08))',
                borderColor: 'rgba(246,196,0,0.34)',
                boxShadow: '0 18px 40px rgba(246,196,0,0.12)',
              }}
            >
              <div className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: '#fff5c8' }}>Simple For Fans</div>
              <div className="mt-2 text-sm font-semibold leading-6" style={{ color: 'rgba(255,248,224,0.96)' }}>
                Browse matches, open the fixture you want and move straight into the live page without extra clutter.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live */}
      {liveNow.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="live-dot w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--secondary)' }} />
            <span
              className="text-sm font-extrabold uppercase tracking-[0.16em]"
              style={{ color: 'var(--secondary)', fontFamily: 'var(--font-body)' }}
            >
              {liveNow.length === 1 ? '1 match in progress' : `${liveNow.length} matches in progress`}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveNow.map((m, i) => (
              <div key={m.id} className="fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <MatchCard match={m} locale={locale} labels={matchLabels} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today */}
      {upcoming.length > 0 && (
        <section>
          <h2
            className="text-sm font-extrabold uppercase tracking-[0.16em] mb-4"
            style={{ color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}
          >
            {tHome('todayMatches')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((m, i) => (
              <div key={m.id} className="fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <MatchCard match={m} locale={locale} labels={matchLabels} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty */}
      {liveNow.length === 0 && upcoming.length === 0 && (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">⚽</div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}>
            {tHome('noMatchesToday')}
          </p>
          <a
            href={`/${locale}/schedule`}
            className="inline-block mt-3 text-sm font-bold transition-opacity hover:opacity-75"
            style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)' }}
          >
            {tHome('viewFullSchedule')} →
          </a>
        </div>
      )}
    </div>
  );
}
