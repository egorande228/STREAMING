import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { cookies, headers } from 'next/headers';
import ServiceWorkerRegister from '@/components/system/ServiceWorkerRegister';
import { resolveLocaleFromCookieOrCountry } from '@/lib/geo';
import { routing } from '@/routing';

async function getAdminLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveLocaleFromCookieOrCountry({
    cookieLocale: cookieStore.get('NEXT_LOCALE')?.value,
    countryCode: headerStore.get('CF-IPCountry'),
    supportedLocales: routing.locales,
    fallbackLocale: routing.defaultLocale,
  });

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, messages } = await getAdminLocale();

  return (
    <html lang={locale}>
      <body className="bg-gray-950 text-white font-sans antialiased min-h-screen">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
