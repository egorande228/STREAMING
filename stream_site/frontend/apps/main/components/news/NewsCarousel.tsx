'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { NewsItem } from '@/lib/news';

function formatPubDate(dateStr: string, locale: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function NewsCard({ item, locale }: { item: NewsItem; locale: string }) {
  const tNews = useTranslations('news');
  return (
    <Link
      href={`/${locale}/news/${item.id}`}
      className="group relative flex min-w-[280px] max-w-[280px] shrink-0 flex-col overflow-hidden rounded-lg border transition-all duration-200 hover:-translate-y-0.5 sm:min-w-[300px] sm:max-w-[300px]"
      style={{
        background: 'linear-gradient(180deg, rgba(17,19,17,0.96), rgba(11,13,12,0.98))',
        borderColor: 'rgba(255,255,255,0.12)',
      }}
    >
      <div className="relative h-[160px] w-full overflow-hidden bg-[#0d0f0d]">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg, rgba(246,196,0,0.14), rgba(18,18,18,0.96))' }}
          >
            ⚽
          </div>
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-16"
          style={{ background: 'linear-gradient(to top, rgba(11,13,12,0.98), transparent)' }}
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 text-[11px] font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
          {formatPubDate(item.publishedAt, locale)}
        </div>
        <h3
          className="line-clamp-3 flex-1 text-sm font-black uppercase leading-snug"
          style={{ color: 'var(--text-hi)' }}
        >
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-2 line-clamp-2 text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>
            {item.description}
          </p>
        )}
        <div
          className="mt-3 text-xs font-black uppercase transition-colors group-hover:text-[var(--text-hi)]"
          style={{ color: 'var(--primary)' }}
        >
          {tNews('readMore')} →
        </div>
      </div>
    </Link>
  );
}

export default function NewsCarousel({ items, locale }: { items: NewsItem[]; locale: string }) {
  const tNews = useTranslations('news');
  const tUi = useTranslations('ui');
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  if (!items.length) return null;

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            className="font-display text-3xl font-black uppercase md:text-4xl"
            style={{ color: 'var(--text-hi)' }}
          >
            {tNews('titlePrefix')} <span style={{ color: 'var(--primary)' }}>{tNews('titleAccent')}</span>
          </h2>
          <div className="mt-3 h-0.5 w-16" style={{ background: 'var(--primary)' }} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label={tUi('scrollLeft')}
            className="flex h-9 w-9 items-center justify-center rounded-full border text-xl font-black transition-all disabled:opacity-30"
            style={{
              borderColor: canScrollLeft ? 'var(--primary)' : 'rgba(255,255,255,0.18)',
              color: canScrollLeft ? 'var(--primary)' : 'var(--text-mid)',
            }}
          >
            ‹
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label={tUi('scrollRight')}
            className="flex h-9 w-9 items-center justify-center rounded-full border text-xl font-black transition-all disabled:opacity-30"
            style={{
              borderColor: canScrollRight ? 'var(--primary)' : 'rgba(255,255,255,0.18)',
              color: canScrollRight ? 'var(--primary)' : 'var(--text-mid)',
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => (
          <NewsCard key={item.id} item={item} locale={locale} />
        ))}
      </div>
    </section>
  );
}
