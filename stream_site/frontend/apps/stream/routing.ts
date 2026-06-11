import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ru', 'es', 'pt', 'ar', 'fr', 'de', 'zh', 'ja', 'ko', 'mn'],
  defaultLocale: 'en',
  localeDetection: true,
});
