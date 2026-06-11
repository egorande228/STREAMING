'use client';

import { useState, useMemo } from 'react';
import type { Match } from '@/lib/api';
import MatchCard from '@/components/match/MatchCard';
import DateStrip from '@/components/match/DateStrip';

interface MatchCardLabels {
  tbd: string;
  halfTime: string;
  fullTime: string;
  versus: string;
  startingNow: string;
}

interface Props {
  matches: Match[];
  locale: string;
  labels: MatchCardLabels;
  todayStr: string;
}

function groupByDate(matches: Match[]): Record<string, Match[]> {
  return matches.reduce((acc, m) => {
    const date = m.scheduled_at.slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(m);
    return acc;
  }, {} as Record<string, Match[]>);
}

function formatDateHeading(iso: string, locale: string) {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric',
  }).toUpperCase();
}

export default function ScheduleView({ matches, locale, labels, todayStr }: Props) {
  const byDate = useMemo(() => groupByDate(matches), [matches]);
  const sortedDates = useMemo(() => Object.keys(byDate).sort(), [byDate]);

  const defaultDate = sortedDates.includes(todayStr) ? todayStr : (sortedDates[0] ?? '');
  const [selected, setSelected] = useState(defaultDate);

  if (sortedDates.length === 0) {
    return (
      <p className="text-center py-20 text-sm" style={{ color: 'var(--text-mid)' }}>
        Schedule coming soon
      </p>
    );
  }

  const dayMatches = byDate[selected] ?? [];

  return (
    <div className="space-y-6">
      {/* Date strip */}
      <DateStrip
        dates={sortedDates}
        selected={selected}
        locale={locale}
        onSelect={setSelected}
      />

      {/* Day heading */}
      {selected && (
        <h2
          className="font-display font-black text-2xl md:text-3xl"
          style={{ color: 'var(--text-hi)', letterSpacing: '-0.04em' }}
        >
          {formatDateHeading(selected, locale)}
        </h2>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dayMatches.map((m, i) => (
          <div key={m.id} className="fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <MatchCard match={m} locale={locale} labels={labels} />
          </div>
        ))}
      </div>

      {dayMatches.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--text-mid)' }}>
          No matches on this day
        </p>
      )}
    </div>
  );
}
