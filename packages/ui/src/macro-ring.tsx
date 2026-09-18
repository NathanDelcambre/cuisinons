'use client';

import { cn } from './cn';
import type { ReactNode } from 'react';

const TONES = {
  peach: { planned: '#f4a574', consumed: '#c96b3a' },
  sage: { planned: '#6f9b7a', consumed: '#3f6b4d' },
  gold: { planned: '#3d342c', consumed: '#8a7a68' },
  tomato: { planned: '#e05a45', consumed: '#9f2f22' },
} as const;

function arc(cx: number, cy: number, r: number, ratio: number) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const start = -Math.PI / 2;
  const end = start + clamped * Math.PI * 2;
  const large = clamped > 0.5 ? 1 : 0;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  if (clamped <= 0) return '';
  if (clamped >= 0.999) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`;
  }
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export function MacroRing({
  label,
  planned,
  consumed,
  target,
  unit,
  tone = 'sage',
  icon,
  className,
}: {
  label: string;
  planned: number;
  consumed: number;
  target: number | null;
  unit: string;
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  className?: string;
}) {
  const hasTarget = target !== null && target > 0;
  const plannedRatio = hasTarget ? planned / target : planned > 0 ? 1 : 0;
  const consumedRatio = hasTarget ? consumed / target : consumed > 0 ? 1 : 0;
  const colors = TONES[tone];
  const plannedLabel = Math.round(planned);
  const consumedLabel = Math.round(consumed);
  const unitSuffix = unit ? ` ${unit}` : '';

  return (
    <div
      className={cn('flex min-w-0 flex-col items-center gap-1', className)}
      aria-label={`${label} : ${String(plannedLabel)}${unitSuffix} prévues, ${String(consumedLabel)}${unitSuffix} consommées`}
    >
      <div className="relative size-16">
        <svg viewBox="0 0 72 72" className="size-16" aria-hidden>
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(45,36,28,0.08)" strokeWidth="5" />
          <circle cx="36" cy="36" r="22" fill="none" stroke="rgba(45,36,28,0.06)" strokeWidth="4" />
          <path d={arc(36, 36, 30, plannedRatio)} fill="none" stroke={colors.planned} strokeWidth="5" strokeLinecap="round" />
          <path d={arc(36, 36, 22, consumedRatio)} fill="none" stroke={colors.consumed} strokeWidth="4" strokeLinecap="round" />
        </svg>
        <p
          className={cn(
            'tabular pointer-events-none absolute inset-0 flex items-center justify-center font-semibold leading-none text-ink-900',
            String(plannedLabel).length > 3 ? 'text-[11px]' : 'text-sm',
          )}
        >
          {plannedLabel}
        </p>
      </div>
      <p className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-0.5 px-0.5 text-center text-[11px] font-medium leading-tight text-ink-500">
        {icon}
        {label}
      </p>
    </div>
  );
}
