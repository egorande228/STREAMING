import type { MetadataRoute } from 'next';

// Prevent search engines from indexing match player pages and admin.
// This reduces the visibility of the site to automated anti-piracy scanners
// that rely on Google/Bing to find streaming pages.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_CANONICAL_URL ?? 'https://wc26.live';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/en', '/ru', '/es', '/pt', '/ar', '/fr', '/de', '/zh', '/ja', '/ko'],
        disallow: [
          '/*/matches/', // individual match player pages
          '/admin',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
