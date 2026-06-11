import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { fetchFullArticle } from '@/lib/news';

export const dynamic = 'force-dynamic';

function formatDate(dateStr: string, locale: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function NewsDetailPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const { locale, slug } = params;
  const tUi = await getTranslations({ locale, namespace: 'ui' });
  const tNews = await getTranslations({ locale, namespace: 'news' });
  const item = await fetchFullArticle(slug);

  if (!item) notFound();

  const hasFullContent = item.paragraphs.length > 1;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      <nav className="flex items-center gap-2 text-xs font-semibold uppercase" style={{ color: 'var(--text-mid)' }}>
        <Link href={`/${locale}`} style={{ color: 'var(--primary)' }}>
          {tUi('home')}
        </Link>
        <span>/</span>
        <span>{tNews('breadcrumb')}</span>
      </nav>

      <article className="space-y-6">
        <h1
          className="font-display text-3xl font-black uppercase leading-tight md:text-4xl"
          style={{ color: 'var(--text-hi)' }}
        >
          {item.title}
        </h1>

        {item.publishedAt && (
          <div className="text-sm font-semibold" style={{ color: 'var(--text-mid)' }}>
            {formatDate(item.publishedAt, locale)}
          </div>
        )}

        {item.image && (
          <div className="overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt={item.title}
              className="w-full object-cover"
              style={{ maxHeight: 460 }}
            />
          </div>
        )}

        <div className="space-y-4">
          {item.paragraphs.map((para, i) => (
            <p
              key={i}
              className="text-base font-semibold leading-relaxed md:text-lg"
              style={{ color: 'rgba(246,243,234,0.88)' }}
            >
              {para}
            </p>
          ))}
        </div>

        {!hasFullContent && (
          <div
            className="rounded-lg border p-5 text-sm"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-mid)' }}
          >
            {tNews('fullArticleNotice')}
            <br />
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-black uppercase transition-colors hover:bg-[var(--primary)] hover:text-black"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              {tNews('readFullArticle')} ↗
            </a>
          </div>
        )}
      </article>

      <Link
        href={`/${locale}`}
        className="inline-flex items-center gap-2 text-sm font-black uppercase"
        style={{ color: 'var(--primary)' }}
      >
        ← {tUi('backToMatches')}
      </Link>
    </div>
  );
}
