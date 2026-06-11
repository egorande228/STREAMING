import EmbedPageClient from '@/components/match/EmbedPageClient';

export const dynamic = 'force-static';

export default function StaticStreamPage({ params }: { params: { locale: string } }) {
  return <EmbedPageClient locale={params.locale} showOpenInNewTab />;
}
