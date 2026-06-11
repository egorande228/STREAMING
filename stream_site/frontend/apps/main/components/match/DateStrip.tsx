'use client';

interface Props {
  dates: string[];        // ['2026-06-11', ...]
  selected: string;
  locale: string;
  onSelect: (date: string) => void;
}

function shortDate(iso: string, locale: string) {
  const d = new Date(iso + 'T12:00:00Z');
  return {
    month: d.toLocaleDateString(locale, { month: 'short' }).toUpperCase(),
    day:   d.getDate(),
  };
}

export default function DateStrip({ dates, selected, locale, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {dates.map((date) => {
        const { month, day } = shortDate(date, locale);
        const isSelected = date === selected;
        return (
          <button
            key={date}
            onClick={() => onSelect(date)}
            className="flex flex-col items-center shrink-0 w-16 py-2.5 rounded-2xl transition-all duration-200"
            style={{
              background:  isSelected
                ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)'
                : 'var(--bg-card)',
              color:       isSelected ? '#0e0e0e' : 'var(--text-mid)',
              fontFamily:  'var(--font-body)',
              border: isSelected ? '1px solid rgba(255,255,255,0.12)' : '1px solid var(--outline-subtle)',
              boxShadow: isSelected ? '0 14px 30px rgba(246,196,0,0.18)' : 'none',
            }}
          >
            <span className="text-[10px] font-bold tracking-wider">{month}</span>
            <span className="text-lg font-bold leading-tight">{day}</span>
          </button>
        );
      })}
    </div>
  );
}
