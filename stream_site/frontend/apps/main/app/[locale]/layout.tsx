import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import LocaleChrome from '@/components/layout/LocaleChrome';
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

  const baseUrl = process.env.NEXT_PUBLIC_CANONICAL_URL ?? 'https://wc26.live';
  const languageAlternates = Object.fromEntries(
    routing.locales.map((supportedLocale) => [supportedLocale, `${baseUrl}/${supportedLocale}`]),
  );
  const tMeta = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: tMeta('title'),
    description: tMeta('description'),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        ...languageAlternates,
        'x-default': `${baseUrl}/${routing.defaultLocale}`,
      },
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
  const tFooter = await getTranslations({ locale, namespace: 'footer' });
  const isRTL = ['ar', 'he', 'fa', 'ur'].includes(locale);

  return (
    <div lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className={`${displayFont.variable} ${bodyFont.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <LocaleChrome locale={locale} footerDisclaimer={tFooter('disclaimer')}>
            {children}
          </LocaleChrome>
        </NextIntlClientProvider>
    </div>
  );
}
