/**
 * Canonical paths under `site/public/sermonrecalllogo/`.
 * Update dimensions here when the raster is replaced.
 */
export const LOGO_ASSETS = {
  /** Primary brand mark (square), used in admin UI and favicon. */
  brandMark: '/sermonrecalllogo/logo.png',
} as const;

/** Intrinsic dimensions of `logo.png` (matches exported raster). */
export const BRAND_LOGO_ASPECT = { width: 1254, height: 1254 } as const;
