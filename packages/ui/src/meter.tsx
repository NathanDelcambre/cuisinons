'use client';

import { motion } from 'motion/react';
import { cn } from './cn';
import { transitions } from './motion';

const TONES = {
  peach: { value: 'text-peach-500', bar: 'bg-peach-400' },
  sage: { value: 'text-sage-600', bar: 'bg-sage-400' },
  gold: { value: 'text-ink-800', bar: 'bg-ink-400' },
  tomato: { value: 'text-tomato-500', bar: 'bg-tomato-400' },
} as const;

/**
 * Jauge d'un macronutriment. Le depassement de l'objectif se lit a la couleur
 * plutot qu'a la longueur : la barre est bornee a 100 %, sinon un ecart de
 * +300 % ecraserait visuellement toutes les autres jauges.
 */
export function Meter({
  label,
  value,
  target,
  unit,
  tone = 'sage',
  className,
}: {
  label: string;
  value: number;
  target: number | null;
  unit: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const hasTarget = target !== null && target > 0;
  const ratio = hasTarget ? value / target : 0;
  const percent = hasTarget ? Math.min(100, ratio * 100) : value > 0 ? 100 : 0;
  const over = hasTarget && ratio > 1.05;
  const colors = TONES[tone];

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-ink-500">{label}</span>
        <span className="tabular shrink-0 text-xs text-ink-600">
          <span className={cn('font-bold', over ? 'text-tomato-500' : colors.value)}>
            {Math.round(value)}
          </span>
          {hasTarget ? ` / ${String(Math.round(target))}` : ''} {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-900/8">
        <motion.div
          className={cn('h-full rounded-full', over ? 'bg-tomato-400' : colors.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${String(percent)}%` }}
          transition={transitions.soft}
        />
      </div>
    </div>
  );
}
