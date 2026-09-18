'use client';

import { Carrot } from 'lucide-react';
import { cn } from '@cuisinons/ui';

export function IngredientIcon({
  src,
  size = 28,
  className,
  bare = false,
}: {
  src?: string | null;
  size?: number;
  className?: string;
  /** Sans pastille blanche : pour un pictogramme dans un titre. */
  bare?: boolean;
}) {
  const box = size >= 32 ? 'size-8' : 'size-7';
  const url = src ? (src.includes('?') ? src : `${src}?v=w`) : null;
  if (!src) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center',
          bare ? 'bg-transparent' : 'rounded-xl bg-white',
          box,
          className,
        )}
      >
        <Carrot className="size-3.5 text-ink-300" aria-hidden />
      </span>
    );
  }
  if (bare) {
    return (
      <span className={cn('relative inline-block shrink-0 overflow-hidden', box, className)}>
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="size-full origin-center scale-[1.75] object-contain"
        />
      </span>
    );
  }
  return (
    <span className={cn('block shrink-0 overflow-hidden rounded-xl bg-white', box, className)}>
      <img src={url ?? src} alt="" width={size} height={size} className="size-full object-cover" />
    </span>
  );
}
