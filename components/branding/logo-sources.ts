/**
 * Canonical paths under site/public/sermonrecalllogo (see .cursor/brand-assets.md).
 * Update here when new files are added to the pack.
 */
export const LOGO_ASSETS = {
  /** Full horizontal lockup: SR mark + “SermonRecall” + LISTEN. REMEMBER. GROW. on dark background */
  wordmarkLockupDarkBg: '/sermonrecalllogo/wordmark-lockup-dark-bg.jpg',
} as const;

/** Intrinsic dimensions of wordmark-lockup-dark-bg (matches exported raster). */
export const WORDMARK_LOCKUP_ASPECT = { width: 1024, height: 565 } as const;
