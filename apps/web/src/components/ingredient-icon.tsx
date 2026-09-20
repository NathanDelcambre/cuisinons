'use client';

import { Carrot, Flame, Leaf, Package, Snowflake, Sparkles, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '@cuisinons/ui';
import { ingredientIconVariant, type IngredientIconVariant } from './ingredient-icon-variant';

const VARIANT_ICON: Record<IngredientIconVariant, LucideIcon> = {
  canned: Package,
  cooked: Flame,
  dried: Sun,
  frozen: Snowflake,
  powder: Sparkles,
  raw: Leaf,
};

export function IngredientIcon({
  src,
  name,
  size = 28,
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const box = size >= 32 ? 'size-8' : 'size-7';
  const url = src ? (src.includes('?') ? src : `${src}?v=c384`) : null;
  const variant = ingredientIconVariant(name);
  const VariantIcon = variant ? VARIANT_ICON[variant] : null;
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
    <span className={cn('relative block shrink-0 rounded-xl bg-white', box, className)}>
      <span className="block size-full overflow-hidden rounded-xl">
        <img
          src={url ?? src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      </span>
      {VariantIcon ? (
        <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full border border-white bg-ink-50 shadow-sm">
          <VariantIcon className="size-2.5 text-ink-600" aria-hidden />
        </span>
      ) : null}
    </span>
  );
}
