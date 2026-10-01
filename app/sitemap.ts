import type { MetadataRoute } from 'next';

import { absolutePublicUrl, publicIndexRoutes } from '@/lib/public-site/ai-discoverability';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicIndexRoutes().map((route) => ({
    url: absolutePublicUrl(route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
