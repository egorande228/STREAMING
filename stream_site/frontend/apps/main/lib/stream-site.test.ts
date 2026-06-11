import { describe, expect, it } from 'vitest';
import { resolveStreamSiteURL } from './stream-site';

describe('resolveStreamSiteURL', () => {
  it('prefers explicit configured URL over mirror and current origin', () => {
    expect(
      resolveStreamSiteURL({
        configuredBaseURL: 'https://stream.example.com/',
        currentOrigin: 'https://main.example.com',
        primaryMirrorDomain: 'mirror.example.com',
      }),
    ).toBe('https://stream.example.com');
  });

  it('falls back to the current protocol plus primary mirror domain when config is absent', () => {
    expect(
      resolveStreamSiteURL({
        currentOrigin: 'http://localhost:3000',
        primaryMirrorDomain: 'localhost:3100',
      }),
    ).toBe('http://localhost:3100');
  });

  it('falls back to the current origin when neither config nor mirror is available', () => {
    expect(
      resolveStreamSiteURL({
        currentOrigin: 'https://main.example.com',
      }),
    ).toBe('https://main.example.com');
  });
});
