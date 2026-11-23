import Image from 'next/image';

import { BRAND_LOGO_ASPECT, BRAND_WORDMARK_ASPECT, LOGO_ASSETS } from './logo-sources';

type Props = {
  variant?: 'header' | 'hero';
  className?: string;
  priority?: boolean;
};

/**
 * Brand logo (Mark B). Renders the mark + "SermonRecall" wordmark, except in a fixed square
 * slot (a className with a numeric width such as `w-8`), where only the mark fits.
 *
 * Ink follows the surface: public and auth pages are always dark, so the on-dark wordmark is
 * the default; inside the admin shell in light mode, `.brand-logo-*` rules in globals.css swap
 * in the on-light version.
 */
export function SermonRecallLogo({ variant = 'header', className, priority }: Props) {
  const isHero = variant === 'hero';
  const classes =
    className ??
    (isHero
      ? 'h-24 w-auto select-none object-contain'
      : 'h-9 w-auto select-none object-contain');
  const squareSlot = /(^|\s)w-\d/.test(classes);
  const loadPriority = priority ?? isHero;
  const sizes = isHero ? 'min(28rem, 90vw)' : '12rem';

  if (squareSlot) {
    return (
      <Image
        src={LOGO_ASSETS.brandMark}
        alt="Sermon Recall"
        width={BRAND_LOGO_ASPECT.width}
        height={BRAND_LOGO_ASPECT.height}
        priority={loadPriority}
        sizes="4rem"
        className={classes}
      />
    );
  }

  const shared = {
    width: BRAND_WORDMARK_ASPECT.width,
    height: BRAND_WORDMARK_ASPECT.height,
    priority: loadPriority,
    sizes,
  };
  return (
    <>
      <Image
        {...shared}
        src={LOGO_ASSETS.wordmarkDark}
        alt="Sermon Recall"
        className={`${classes} max-w-full brand-logo-dark`}
      />
      <Image
        {...shared}
        src={LOGO_ASSETS.wordmarkLight}
        alt=""
        aria-hidden
        className={`${classes} max-w-full brand-logo-light`}
      />
    </>
  );
}
