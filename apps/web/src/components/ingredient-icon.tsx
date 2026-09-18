'use client';

import { Carrot } from 'lucide-react';
import { cn } from '@cuisinons/ui';

export function IngredientIcon({
  src,
  size = 28,
  className,
}: {
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const box = size >= 32 ? 'size-8' : 'size-7';
  const url = src ? (src.includes('?') ? src : `${src}?v=w`) : null;
  if (!src) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl bg-white',
          box,
          className,
        )}
      >
        <Carrot className="size-3.5 text-ink-300" aria-hidden />
      </span>
    );
  }
  return (
    <span className={cn('block shrink-0 overflow-hidden rounded-xl bg-white', box, className)}>
      <img src={url ?? src} alt="" width={size} height={size} className="size-full object-cover" />
    </span>
  );
}
