interface EmbedQuery {
  lang?: string;
  region?: string;
}

export function buildLocalizedEmbedPath(locale: string, matchId: string, query: EmbedQuery = {}): string {
  const searchParams = new URLSearchParams();
  if (query.lang) searchParams.set('lang', query.lang);
  if (query.region) searchParams.set('region', query.region);

  const queryString = searchParams.toString();
  return `/${locale}/embed/${matchId}${queryString ? `?${queryString}` : ''}`;
}
