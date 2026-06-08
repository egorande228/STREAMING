import type { MetadataRoute } from 'next';

// Prevent search engines from indexing match detail pages and admin.
// This keeps public landing/schedule/group pages indexable without exposing
// individual match detail pages to search result crawlers.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_CANONICAL_URL ?? 'https://wc26.live';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/en', '/ru', '/es', '/pt', '/ar', '/fr', '/de', '/zh', '/ja', '/ko', '/mn'],
        disallow: [
          '/*/matches/', // individual match detail pages
          '/admin',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
