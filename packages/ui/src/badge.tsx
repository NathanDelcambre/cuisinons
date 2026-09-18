import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'sage' | 'peach' | 'tomato';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-ink-900/6 text-ink-700',
  sage: 'bg-sage-100 text-sage-700',
  peach: 'bg-peach-200 text-peach-500',
  tomato: 'bg-tomato-100 text-tomato-600',
};

export function Badge({
  tone = 'neutral',
  icon: Icon,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}
