import Image from 'next/image';
import { cn } from '@cuisinons/ui';

export function Avatar({
  name,
  src,
  className,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
}) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '·';

  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-sage-400 font-semibold text-white',
        className,
      )}
    >
      {src ? <Image src={src} alt="" fill sizes="80px" className="object-cover" /> : initial}
    </span>
  );
}
