import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import EmbedStreamView from '@/components/match/EmbedStreamView';
import { api } from '@/lib/api';
import { mapCountryToRegion } from '@/lib/geo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { lang?: string; region?: string };
}) {
  const { locale, id } = params;
  const tMatch = await getTranslations({ locale, namespace: 'match' });
  const lang = searchParams.lang ?? locale;
  const countryCode = headers().get('CF-IPCountry');
  const region = searchParams.region ?? mapCountryToRegion(countryCode);

  let match;
  try {
    match = await api.matches.get(Number(id), lang, region);
  } catch {
    return <div className="flex min-h-screen items-center justify-center bg-black text-gray-500">{tMatch('notFound')}</div>;
  }

  return <EmbedStreamView match={match} locale={locale} lang={lang} region={region} />;
}
