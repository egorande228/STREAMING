export type Region = 'eu' | 'us' | 'asia' | 'mena' | 'global';

const DEFAULT_FALLBACK_LOCALE = 'en';

const MENA_COUNTRIES = new Set([
  'AE', 'BH', 'DZ', 'EG', 'IQ', 'IR', 'JO', 'KW', 'LB', 'LY', 'MA', 'OM', 'PS', 'QA', 'SA', 'SD', 'SY', 'TN', 'TR', 'YE',
]);

const EUROPE_COUNTRIES = new Set([
  'AD', 'AL', 'AM', 'AT', 'AZ', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FO', 'FR', 'GB',
  'GE', 'GG', 'GI', 'GR', 'HR', 'HU', 'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT',
  'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'UA', 'VA',
]);

const ASIA_COUNTRIES = new Set([
  'AF', 'BD', 'BN', 'BT', 'CN', 'HK', 'ID', 'IN', 'JP', 'KG', 'KH', 'KP', 'KR', 'KZ', 'LA', 'LK', 'MM', 'MN', 'MO', 'MV',
  'MY', 'NP', 'PH', 'PK', 'SG', 'TH', 'TJ', 'TM', 'TW', 'UZ', 'VN',
]);

const AMERICAS_COUNTRIES = new Set([
  'AG', 'AI', 'AR', 'AW', 'BB', 'BL', 'BM', 'BO', 'BQ', 'BR', 'BS', 'BZ', 'CA', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO',
  'EC', 'FK', 'GD', 'GF', 'GL', 'GP', 'GT', 'GY', 'HN', 'HT', 'JM', 'KN', 'KY', 'LC', 'MF', 'MQ', 'MS', 'MX', 'NI', 'PA',
  'PE', 'PM', 'PR', 'PY', 'SR', 'SV', 'SX', 'TC', 'TT', 'US', 'UY', 'VC', 'VE', 'VG', 'VI',
]);

const RUSSIAN_LOCALE_COUNTRIES = new Set(['RU', 'BY', 'KZ', 'KG']);
const SPANISH_LOCALE_COUNTRIES = new Set([
  'ES', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'VE', 'EC', 'PY', 'BO', 'CR', 'PA', 'GT', 'SV', 'HN', 'NI', 'DO', 'PR',
]);
const PORTUGUESE_LOCALE_COUNTRIES = new Set(['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL']);
const ARABIC_LOCALE_COUNTRIES = new Set([
  'AE', 'BH', 'DZ', 'EG', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MA', 'OM', 'PS', 'QA', 'SA', 'SD', 'SY', 'TN', 'YE',
]);
const FRENCH_LOCALE_COUNTRIES = new Set(['FR', 'BE', 'LU', 'MC']);
const GERMAN_LOCALE_COUNTRIES = new Set(['DE', 'AT', 'CH', 'LI']);
const CHINESE_LOCALE_COUNTRIES = new Set(['CN', 'TW', 'HK', 'MO']);

function normalizeCountryCode(countryCode?: string | null): string | null {
  if (!countryCode) {
    return null;
  }

  const normalized = countryCode.trim().toUpperCase();
  return normalized.length === 2 ? normalized : null;
}

function ensureSupportedLocale(
  locale: string,
  supportedLocales: readonly string[],
  fallbackLocale: string,
): string {
  if (supportedLocales.includes(locale)) {
    return locale;
  }

  if (supportedLocales.includes(fallbackLocale)) {
    return fallbackLocale;
  }

  return supportedLocales[0] ?? DEFAULT_FALLBACK_LOCALE;
}

export function mapCountryToRegion(countryCode?: string | null): Region {
  const country = normalizeCountryCode(countryCode);
  if (!country) {
    return 'global';
  }

  if (MENA_COUNTRIES.has(country)) {
    return 'mena';
  }

  if (EUROPE_COUNTRIES.has(country)) {
    return 'eu';
  }

  if (ASIA_COUNTRIES.has(country)) {
    return 'asia';
  }

  if (AMERICAS_COUNTRIES.has(country)) {
    return 'us';
  }

  return 'global';
}

export function mapCountryToLocale(
  countryCode: string | null | undefined,
  supportedLocales: readonly string[],
  fallbackLocale = DEFAULT_FALLBACK_LOCALE,
): string {
  const country = normalizeCountryCode(countryCode);
  if (!country) {
    return ensureSupportedLocale(fallbackLocale, supportedLocales, fallbackLocale);
  }

  let locale = fallbackLocale;
  if (RUSSIAN_LOCALE_COUNTRIES.has(country)) {
    locale = 'ru';
  } else if (SPANISH_LOCALE_COUNTRIES.has(country)) {
    locale = 'es';
  } else if (PORTUGUESE_LOCALE_COUNTRIES.has(country)) {
    locale = 'pt';
  } else if (ARABIC_LOCALE_COUNTRIES.has(country)) {
    locale = 'ar';
  } else if (FRENCH_LOCALE_COUNTRIES.has(country)) {
    locale = 'fr';
  } else if (GERMAN_LOCALE_COUNTRIES.has(country)) {
    locale = 'de';
  } else if (CHINESE_LOCALE_COUNTRIES.has(country)) {
    locale = 'zh';
  } else if (country === 'JP') {
    locale = 'ja';
  } else if (country === 'KR') {
    locale = 'ko';
  }

  return ensureSupportedLocale(locale, supportedLocales, fallbackLocale);
}

export function resolveLocaleFromCookieOrCountry({
  cookieLocale,
  countryCode,
  supportedLocales,
  fallbackLocale = DEFAULT_FALLBACK_LOCALE,
}: {
  cookieLocale?: string | null;
  countryCode?: string | null;
  supportedLocales: readonly string[];
  fallbackLocale?: string;
}): string {
  const normalizedCookieLocale = cookieLocale?.trim().toLowerCase();
  if (normalizedCookieLocale && supportedLocales.includes(normalizedCookieLocale)) {
    return normalizedCookieLocale;
  }

  return mapCountryToLocale(countryCode, supportedLocales, fallbackLocale);
}
