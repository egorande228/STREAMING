import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { routing } from '@/routing';

const displayFont = localFont({
  src: '../fonts/GeistVF.woff',
  variable: '--font-display',
  weight: '100 900',
});

const bodyFont = localFont({
  src: '../fonts/GeistMonoVF.woff',
  variable: '--font-body',
  weight: '100 900',
});

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = routing.locales.includes(params.locale as (typeof routing.locales)[number])
    ? params.locale
    : routing.defaultLocale;

  const streamBase = process.env.NEXT_PUBLIC_CANONICAL_URL ?? 'https://stream.wc26.live';
  const tMeta = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: tMeta('title') + ' — Match Coverage',
    description: tMeta('description'),
    alternates: {
      canonical: `${streamBase}/${locale}`,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  const messages = await getMessages();
  const isRTL = ['ar', 'he', 'fa', 'ur'].includes(locale);

  return (
    <div lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className={`${displayFont.variable} ${bodyFont.variable}`}>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
