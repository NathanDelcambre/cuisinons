'use client';

import { categoryIconUrl } from '@cuisinons/shared';
import { cn } from '@cuisinons/ui';

export function CategoryIcon({
  category,
  className,
}: {
  category: string | null | undefined;
  className?: string;
}) {
  return (
    <img
      src={categoryIconUrl(category)}
      alt=""
      width={20}
      height={20}
      className={cn('size-5 shrink-0', className)}
      aria-hidden
    />
  );
}
