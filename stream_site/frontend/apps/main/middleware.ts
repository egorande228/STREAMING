import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './routing';
import { resolveLocaleFromCookieOrCountry } from './lib/geo';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localePattern = routing.locales.join('|');
  const hasLocalePrefixRe = new RegExp(`^/(${localePattern})(?:/|$)`);
  const localizedAdminRe = new RegExp(`^/(${localePattern})/admin(?:/.*)?$`);

  if (localizedAdminRe.test(pathname)) {
    const withoutLocale = pathname.replace(new RegExp(`^/(${localePattern})`), '');
    const url = request.nextUrl.clone();
    url.pathname = withoutLocale || '/admin/login';
    return NextResponse.redirect(url);
  }

  if (pathname === '/admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (pathname === '/' || !hasLocalePrefixRe.test(pathname)) {
    const locale = resolveLocaleFromCookieOrCountry({
      cookieLocale: request.cookies.get('NEXT_LOCALE')?.value,
      countryCode: request.headers.get('CF-IPCountry'),
      supportedLocales: routing.locales,
      fallbackLocale: routing.defaultLocale,
    });

    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
