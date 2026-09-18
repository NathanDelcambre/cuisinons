'use client';

import { Beef, Droplet, Flame, Wheat, type LucideIcon } from 'lucide-react';
import { cn } from '@cuisinons/ui';

export const MACRO_ICON = {
  kcal: { icon: Flame, className: 'text-peach-500' },
  protein: { icon: Beef, className: 'text-sage-600' },
  carbs: { icon: Wheat, className: 'text-ink-800' },
  fat: { icon: Droplet, className: 'text-tomato-500' },
} as const;

export type MacroKey = keyof typeof MACRO_ICON;

export function MacroIcon({
  kind,
  className,
}: {
  kind: MacroKey;
  className?: string;
}) {
  const Icon: LucideIcon = MACRO_ICON[kind].icon;
  return <Icon className={cn('size-3.5', MACRO_ICON[kind].className, className)} aria-hidden />;
}
