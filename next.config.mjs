import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Links sent before Nov 2026 were built from a site URL ending in /auth/callback
  // (e.g. /auth/callback/join/CODE). Send them to the real pages.
  async redirects() {
    return [
      { source: '/auth/callback/join/:code', destination: '/join/:code', permanent: true },
      { source: '/auth/callback/invite/:token', destination: '/invite/:token', permanent: true },
      { source: '/auth/callback/billing', destination: '/billing', permanent: false },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
  },
  webpack: (config, { nextRuntime }) => {
    if (nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@supabase/ssr': path.join(
          rootDir,
          'node_modules/@supabase/ssr/dist/module/index.js',
        ),
      };
    }
    return config;
  },
};

export default nextConfig;
