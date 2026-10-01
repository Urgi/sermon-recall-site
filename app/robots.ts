import type { MetadataRoute } from 'next';

import { publicSiteUrl } from '@/lib/public-site/config';

const DISALLOW_PRIVATE = [
  '/api/',
  '/dashboard',
  '/sermons',
  '/settings',
  '/notifications',
  '/team',
  '/members',
  '/auth/',
  '/invite/',
  '/join/',
  '/dev/',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
];

/** Major AI / answer-engine crawlers — allow public pages, keep admin private. */
const AI_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'CCBot',
  'meta-externalagent',
];

export default function robots(): MetadataRoute.Robots {
  const base = publicSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW_PRIVATE,
      },
      ...AI_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOW_PRIVATE,
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
