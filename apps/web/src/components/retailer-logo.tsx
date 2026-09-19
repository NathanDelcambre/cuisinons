import Image from 'next/image';
import { type Retailer } from '@cuisinons/shared';
import { cn } from '@cuisinons/ui';

const RETAILER_LOGOS: Record<Retailer, string> = {
  LECLERC: '/retailers/leclerc.webp',
  U: '/retailers/u.png',
  CARREFOUR: '/retailers/carrefour.webp',
  AUCHAN: '/retailers/auchan.png',
  LIDL: '/retailers/lidl.png',
  INTERMARCHE: '/retailers/intermarche.webp',
};

export function RetailerLogo({ retailer, className }: { retailer: Retailer; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5 shadow-soft',
        className,
      )}
    >
      <Image
        src={RETAILER_LOGOS[retailer]}
        alt=""
        width={64}
        height={64}
        className={cn('size-full object-contain', retailer === 'U' && 'scale-125')}
      />
    </span>
  );
}
