import Image from 'next/image';

import { BRAND_LOGO_ASPECT, LOGO_ASSETS } from './logo-sources';

type Props = {
  variant?: 'header' | 'hero';
  className?: string;
  priority?: boolean;
};

export function SermonRecallLogo({ variant = 'header', className, priority }: Props) {
  const src = LOGO_ASSETS.brandMark;
  const isHero = variant === 'hero';

  return (
    <Image
      src={src}
      alt="Sermon Recall"
      width={BRAND_LOGO_ASPECT.width}
      height={BRAND_LOGO_ASPECT.height}
      priority={priority ?? isHero}
      sizes={isHero ? 'min(20rem, 80vw)' : '8rem'}
      className={
        className ??
        (isHero
          ? 'h-32 w-auto max-w-[min(20rem,85vw)] select-none object-contain'
          : 'h-8 w-auto max-w-[8rem] select-none object-contain')
      }
    />
  );
}
