'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from './cn';
import { transitions } from './motion';

const TONES = {
  peach: { value: 'text-peach-500', bar: 'bg-peach-400', consumed: 'bg-peach-500' },
  sage: { value: 'text-sage-600', bar: 'bg-sage-400', consumed: 'bg-sage-600' },
  gold: { value: 'text-ink-800', bar: 'bg-ink-400', consumed: 'bg-ink-800' },
  tomato: { value: 'text-tomato-500', bar: 'bg-tomato-400', consumed: 'bg-tomato-500' },
} as const;

function barPercent(value: number, target: number | null) {
  const hasTarget = target !== null && target > 0;
  const ratio = hasTarget ? value / target : 0;
  return {
    hasTarget,
    ratio,
    percent: hasTarget ? Math.min(100, ratio * 100) : value > 0 ? 100 : 0,
    over: hasTarget && ratio > 1.05,
  };
}

/**
 * Jauge d'un macronutriment. Le depassement de l'objectif se lit a la couleur
 * plutot qu'a la longueur : la barre est bornee a 100 %, sinon un ecart de
 * +300 % ecraserait visuellement toutes les autres jauges.
 */
export function Meter({
  label,
  value,
  consumed,
  target,
  unit,
  tone = 'sage',
  icon,
  className,
}: {
  label: string;
  value: number;
  consumed?: number;
  target: number | null;
  unit: string;
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  className?: string;
}) {
  const planned = barPercent(value, target);
  const eaten = consumed === undefined ? null : barPercent(consumed, target);
  const colors = TONES[tone];
  const plannedLabel = Math.round(value);
  const consumedLabel = eaten ? Math.round(consumed ?? 0) : null;
  const unitSuffix = unit ? ` ${unit}` : '';

  return (
    <div
      className={cn('min-w-0', className)}
      aria-label={
        consumedLabel === null
          ? undefined
          : `${label} : ${String(plannedLabel)}${unitSuffix} prévues, ${String(consumedLabel)}${unitSuffix} consommées`
      }
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 truncate text-xs font-medium text-ink-500">
          {icon}
          {label}
        </span>
        <span className="tabular shrink-0 text-xs text-ink-600">
          <span className={cn('font-bold', planned.over ? 'text-tomato-500' : colors.value)}>
            {plannedLabel}
          </span>
          {planned.hasTarget && target !== null ? ` / ${String(Math.round(target))}` : ''}
          {unitSuffix}
        </span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-ink-900/8">
        <motion.div
          className={cn('absolute inset-y-0 left-0 rounded-full', planned.over ? 'bg-tomato-400' : colors.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${String(planned.percent)}%` }}
          transition={transitions.soft}
        />
        {eaten ? (
          <motion.div
            className={cn('absolute inset-y-0 left-0 rounded-full', eaten.over ? 'bg-tomato-500' : colors.consumed)}
            initial={{ width: 0 }}
            animate={{ width: `${String(eaten.percent)}%` }}
            transition={transitions.soft}
          />
        ) : null}
      </div>
    </div>
  );
}
