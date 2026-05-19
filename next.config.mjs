import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
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
