'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import EmbedStreamView from '@/components/match/EmbedStreamView';
import { api, type Match } from '@/lib/api';
import { mapCountryToRegion } from '@/lib/geo';

interface Props {
  locale: string;
  showOpenInNewTab?: boolean;
}

export default function EmbedPageClient({ locale, showOpenInNewTab = false }: Props) {
  const searchParams = useSearchParams();
  const tMatch = useTranslations('match');
  const tStream = useTranslations('streamPage');
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const matchId = searchParams.get('id') ?? searchParams.get('match');
  const lang = searchParams.get('lang') ?? locale;
  const region = useMemo(() => searchParams.get('region') ?? mapCountryToRegion(undefined), [searchParams]);

  useEffect(() => {
    if (!matchId) {
      setIsLoading(false);
      setError(tMatch('notFound'));
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api.matches
      .get(Number(matchId), lang, region)
      .then((data) => {
        if (!cancelled) setMatch(data);
      })
      .catch(() => {
        if (!cancelled) setError(tMatch('notFound'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lang, matchId, region, tMatch]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm font-black uppercase tracking-[0.18em] text-gray-500">
        {tStream('brand')}
      </div>
    );
  }

  if (error || !match) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-gray-500">{error}</div>;
  }

  return (
    <div className="relative min-h-screen bg-black">
      <EmbedStreamView match={match} locale={locale} lang={lang} region={region} />
      {showOpenInNewTab && (
        <a
          href={`/${locale}/embed?id=${match.id}&lang=${encodeURIComponent(lang)}&region=${encodeURIComponent(region)}`}
          className="absolute right-3 top-3 rounded-md bg-black/70 px-3 py-2 text-xs font-black uppercase text-white"
          target="_blank"
          rel="noopener noreferrer"
        >
          iframe
        </a>
      )}
    </div>
  );
}
