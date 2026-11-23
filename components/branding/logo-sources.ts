/**
 * Canonical brand rasters under `site/public/brand/` (Mark B — arched doorway + SR + book).
 * Generated from Garvin's logo pack; see `.cursor/brand-assets.md` for the full inventory.
 * Favicon, Apple touch icon and the share image are Next.js metadata files in `app/`
 * (`favicon.ico`, `icon.png`, `apple-icon.png`, `opengraph-image.png`).
 * Update dimensions here when a raster is replaced.
 */
export const LOGO_ASSETS = {
  /** Mark only, transparent; works on light and dark. Used by `SermonRecallLogo`. */
  brandMark: '/brand/mark.png',
  /** Mark + "SermonRecall" for light / dark backgrounds. */
  wordmarkLight: '/brand/wordmark-light.png',
  wordmarkDark: '/brand/wordmark-dark.png',
  /** Wordmark + "LISTEN. REMEMBER. GROW." tagline. */
  lockupLight: '/brand/lockup-light.png',
  lockupDark: '/brand/lockup-dark.png',
  /** Full-bleed square app icon (structured data, partner listings). */
  appIcon: '/brand/app-icon.png',
  /** Light lockup on white, 2x, for transactional email headers. */
  emailLogo: '/brand/email-logo.png',
} as const;

/** Intrinsic dimensions of `mark.png`. */
export const BRAND_LOGO_ASPECT = { width: 453, height: 512 } as const;

/** Intrinsic dimensions of the wordmark / lockup rasters. */
export const BRAND_WORDMARK_ASPECT = { width: 1200, height: 309 } as const;
