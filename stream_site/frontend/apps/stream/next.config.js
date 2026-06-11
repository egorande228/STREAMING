const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const hlsProxyUrl = process.env.HLS_PROXY_URL || 'http://localhost:8089';
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/hls/:path*', destination: `${hlsProxyUrl}/:path*` },
      { source: '/proxy', destination: `${hlsProxyUrl}/proxy` },
      { source: '/channel/:path*', destination: `${hlsProxyUrl}/channel/:path*` },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
