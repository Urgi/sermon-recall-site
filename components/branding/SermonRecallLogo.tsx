import Image from 'next/image';

import { LOGO_ASSETS, WORDMARK_LOCKUP_ASPECT } from './logo-sources';

type Props = {
  variant?: 'header' | 'hero';
  className?: string;
  priority?: boolean;
};

export function SermonRecallLogo({ variant = 'header', className, priority }: Props) {
  const src = LOGO_ASSETS.wordmarkLockupDarkBg;
  const isHero = variant === 'hero';

  return (
    <Image
      src={src}
      alt="SermonRecall — Listen. Remember. Grow."
      width={WORDMARK_LOCKUP_ASPECT.width}
      height={WORDMARK_LOCKUP_ASPECT.height}
      priority={priority ?? isHero}
      sizes={
        isHero
          ? '(min-width: 840px) min(42vw, 32.5rem), min(25rem, calc(100vw - 2 * clamp(1.25rem, 5vw, 2rem)))'
          : '10rem'
      }
      className={className ?? (isHero ? 'h-auto w-full' : 'h-8 w-auto max-w-[10rem] select-none')}
    />
  );
}
