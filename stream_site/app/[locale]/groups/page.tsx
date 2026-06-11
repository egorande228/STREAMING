import { api, type Group, type Standing } from '@/lib/api';
import { getTranslations } from 'next-intl/server';
import FlagDisplay from '@/components/match/FlagDisplay';

async function getGroups(): Promise<Group[]> {
  try {
    const res = await api.groups.list();
    return res.groups ?? [];
  } catch {
    return [];
  }
}

function StandingsTable({
  teams,
  locale,
  labels,
}: {
  teams: Standing[];
  locale: string;
  labels: {
    team: string;
    played: string;
    won: string;
    drawn: string;
    lost: string;
    gd: string;
    points: string;
    qualified: string;
  };
}) {
  const nameKey = locale === 'ru' ? 'name_ru' : 'name_en';
  return (
    <table className="w-full">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--outline-subtle)' }}>
          <th
            className="text-left pb-2.5 text-[10px] tracking-widest uppercase font-medium"
            style={{ color: 'var(--text-lo)' }}
          >
            {labels.team}
          </th>
          {[labels.played, labels.won, labels.drawn, labels.lost, labels.gd].map((h) => (
            <th
              key={h}
              className="text-center pb-2.5 text-[10px] tracking-widest uppercase font-medium w-8"
              style={{ color: 'var(--text-lo)' }}
            >
              {h}
            </th>
          ))}
          <th
            className="text-center pb-2.5 text-[10px] tracking-widest uppercase font-medium w-10"
            style={{ color: 'var(--primary)' }}
          >
            {labels.points}
          </th>
        </tr>
      </thead>
      <tbody>
        {teams.map((t, i) => {
          const isQualified = i < 2;
          return (
            <tr
              key={t.id}
              className="transition-colors duration-150"
              style={{
                borderBottom: i < teams.length - 1 ? '1px solid var(--outline-dim)' : 'none',
              }}
            >
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="font-score text-[11px] w-4 tabular-nums"
                    style={{ color: 'var(--text-lo)' }}
                  >
                    {i + 1}
                  </span>
                  {isQualified && (
                    <div
                      className="w-0.5 h-3.5 rounded-full shrink-0"
                      style={{ background: 'var(--primary)', opacity: 0.7 }}
                    />
                  )}
                  <FlagDisplay src={t.flag_url} name={t[nameKey] ?? t.name_en} size="xs" />
                  <span
                    className="text-xs font-medium truncate max-w-[100px]"
                    style={{ color: isQualified ? 'var(--text-hi)' : 'var(--text-mid)' }}
                  >
                    {t[nameKey] ?? t.name_en}
                  </span>
                </div>
              </td>
              <td className="text-center py-2.5 font-score text-xs" style={{ color: 'var(--text-mid)' }}>
                {t.played}
              </td>
              <td className="text-center py-2.5 font-score text-xs" style={{ color: 'var(--text-mid)' }}>
                {t.won}
              </td>
              <td className="text-center py-2.5 font-score text-xs" style={{ color: 'var(--text-mid)' }}>
                {t.drawn}
              </td>
              <td className="text-center py-2.5 font-score text-xs" style={{ color: 'var(--text-mid)' }}>
                {t.lost}
              </td>
              <td className="text-center py-2.5 font-score text-xs" style={{ color: 'var(--text-mid)' }}>
                {t.gd > 0 ? `+${t.gd}` : t.gd}
              </td>
              <td
                className="text-center py-2.5 font-score text-sm font-medium"
                style={{ color: isQualified ? 'var(--primary)' : 'var(--text-mid)' }}
              >
                {t.points}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default async function GroupsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const tGroups = await getTranslations({ locale, namespace: 'groups' });
  const groups = await getGroups();

  const standingsLabels = {
    team:      tGroups('team'),
    played:    tGroups('played'),
    won:       tGroups('won'),
    drawn:     tGroups('drawn'),
    lost:      tGroups('lost'),
    gd:        tGroups('gd'),
    points:    tGroups('points'),
    qualified: tGroups('qualified'),
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border p-6 md:p-8" style={{ background: 'linear-gradient(180deg, rgba(17,17,17,0.98), rgba(10,10,10,0.98))', borderColor: 'var(--outline-subtle)' }}>
        <p className="brand-kicker mb-3">Tournament Groups</p>
        <h1
          className="font-display text-5xl md:text-6xl font-black italic"
          style={{ color: 'var(--text-hi)', lineHeight: '0.92' }}
        >
          {tGroups('title')}
        </h1>
        <p className="mt-4 max-w-2xl text-sm md:text-base" style={{ color: 'var(--text-mid)' }}>
          Track every group table, qualified positions and the race for the knockout stage.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-24 text-sm" style={{ color: 'var(--text-mid)' }}>
          <p>{tGroups('notAvailable')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl p-5"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--outline-subtle)',
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="font-display text-3xl"
                  style={{ color: 'var(--text-mid)' }}
                >
                  {tGroups('group')}
                </span>
                <span
                  className="font-display text-4xl"
                  style={{ color: 'var(--primary)' }}
                >
                  {group.name}
                </span>
              </div>

              {group.teams && group.teams.length > 0 ? (
                <StandingsTable
                  teams={group.teams}
                  locale={locale}
                  labels={standingsLabels}
                />
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-lo)' }}>
                  {tGroups('teamsTbd')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
