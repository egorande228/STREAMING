import { describe, expect, it } from 'vitest';
import { buildLocalizedEmbedPath } from './embed';

describe('buildLocalizedEmbedPath', () => {
  it('builds a localized embed path with existing query preferences preserved', () => {
    expect(buildLocalizedEmbedPath('ru', '42', { lang: 'en', region: 'europe' })).toBe(
      '/ru/embed/42?lang=en&region=europe',
    );
  });

  it('omits empty query values', () => {
    expect(buildLocalizedEmbedPath('en', '7', { lang: '', region: undefined })).toBe('/en/embed/7');
  });
});
