import { api } from '@/lib/api';
import { mapCountryToRegion } from '@/lib/geo';
import MatchLiveView from '@/components/match/MatchLiveView';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MatchPage({
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
    return <div className="py-20 text-center text-gray-500">{tMatch('notFound')}</div>;
  }

  return <MatchLiveView match={match} locale={locale} lang={lang} region={region} />;
}
