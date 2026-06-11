import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './routing';
import { resolveLocaleFromCookieOrCountry } from './lib/geo';
import { buildLocalizedEmbedPath } from './lib/embed';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localePattern = routing.locales.join('|');
  const hasLocalePrefixRe = new RegExp(`^/(${localePattern})(?:/|$)`);

  if (pathname === '/' || !hasLocalePrefixRe.test(pathname)) {
    const locale = resolveLocaleFromCookieOrCountry({
      cookieLocale: request.cookies.get('NEXT_LOCALE')?.value,
      countryCode: request.headers.get('CF-IPCountry'),
      supportedLocales: routing.locales,
      fallbackLocale: routing.defaultLocale,
    });

    const url = request.nextUrl.clone();
    const embedMatch = pathname.match(/^\/embed\/([^/]+)$/);
    if (embedMatch) {
      const localizedPath = buildLocalizedEmbedPath(locale, embedMatch[1], {
        lang: request.nextUrl.searchParams.get('lang') ?? undefined,
        region: request.nextUrl.searchParams.get('region') ?? undefined,
      });
      const [localizedPathname, localizedSearch] = localizedPath.split('?');
      url.pathname = localizedPathname;
      url.search = localizedSearch ? `?${localizedSearch}` : '';
    } else {
      url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
    }
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
