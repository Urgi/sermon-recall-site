export type SermonsFilterId = 'all' | 'review_needed' | 'processing' | 'failed' | 'published';

const FILTER_IDS: SermonsFilterId[] = ['all', 'review_needed', 'processing', 'failed', 'published'];

export function parseSermonsFilter(raw: string | undefined): SermonsFilterId | null {
  if (raw && FILTER_IDS.includes(raw as SermonsFilterId)) return raw as SermonsFilterId;
  return null;
}
