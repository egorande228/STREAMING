import { api, type Match } from '@/lib/api';
import { getTranslations } from 'next-intl/server';
import ScheduleView from '@/components/match/ScheduleView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getAllMatches(): Promise<Match[]> {
  try {
    const res = await api.matches.list();
    return res.matches ?? [];
  } catch {
    return [];
  }
}

export default async function SchedulePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const tSchedule = await getTranslations({ locale, namespace: 'schedule' });
  const tMatch    = await getTranslations({ locale, namespace: 'match' });
  const matches   = await getAllMatches();
  const todayStr  = new Date().toISOString().slice(0, 10);

  const matchLabels = {
    tbd:         tMatch('tbd'),
    halfTime:    tMatch('halfTime'),
    fullTime:    tMatch('finished'),
    versus:      tMatch('versus'),
    startingNow: tMatch('startingNow'),
  };

  return (
    <div>
      <h1
        className="font-display font-bold text-5xl md:text-6xl mb-8"
        style={{ color: 'var(--text-hi)' }}
      >
        {tSchedule('title')}
      </h1>

      <ScheduleView
        matches={matches}
        locale={locale}
        labels={matchLabels}
        todayStr={todayStr}
      />
    </div>
  );
}
