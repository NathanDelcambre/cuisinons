import { ChefHat } from 'lucide-react';
import { cn } from '@cuisinons/ui';

export function RecipeCover({
  src,
  className,
  eager = false,
}: {
  src?: string | null;
  className?: string;
  sizes?: string;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <div className={cn('flex aspect-[16/10] shrink-0 items-center justify-center bg-sage-100/60', className)}>
        <ChefHat className="size-8 text-sage-400" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={cn('aspect-[16/10] w-full shrink-0 object-cover', className)}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'low'}
    />
  );
}
