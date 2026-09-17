'use client';

import { motion } from 'motion/react';
import { cn } from './cn';
import { transitions } from './motion';

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
  className,
}: {
  label: string;
  value: number;
  target: number | null;
  unit: string;
  className?: string;
}) {
  const hasTarget = target !== null && target > 0;
  const ratio = hasTarget ? value / target : 0;
  const percent = hasTarget ? Math.min(100, ratio * 100) : value > 0 ? 100 : 0;
  const over = hasTarget && ratio > 1.05;

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-medium text-ink-500">{label}</span>
        <span className="tabular shrink-0 text-xs text-ink-600">
          <span className={cn('font-medium', over ? 'text-tomato-500' : 'text-ink-900')}>
            {Math.round(value)}
          </span>
          {hasTarget ? ` / ${String(Math.round(target))}` : ''} {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-900/8">
        <motion.div
          className={cn('h-full rounded-full', over ? 'bg-tomato-400' : 'bg-sage-400')}
          initial={{ width: 0 }}
          animate={{ width: `${String(percent)}%` }}
          transition={transitions.soft}
        />
      </div>
    </div>
  );
}
