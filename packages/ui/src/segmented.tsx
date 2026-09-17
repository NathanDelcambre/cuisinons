'use client';

import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from './cn';
import { transitions } from './motion';

export type SegmentedOption<T extends string> = { value: T; label: string; sublabel?: string };

/**
 * Selecteur segmente. La pastille active est un seul element partage entre les
 * options (`layoutId`) : elle glisse de l'une a l'autre au lieu de disparaitre
 * puis reapparaitre.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (next: T) => void;
  /** Decrit le groupe pour les lecteurs d'ecran. */
  label: string;
  className?: string;
}) {
  const groupId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('glass inline-flex gap-1 rounded-full p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative min-h-9 rounded-full px-4 text-sm font-medium transition-colors duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
              active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`segmented-${groupId}`}
                transition={transitions.spring}
                className="absolute inset-0 rounded-full bg-white shadow-soft"
              />
            ) : null}
            <span className="relative flex flex-col items-center leading-tight">
              {option.label}
              {option.sublabel ? (
                <span className="text-[11px] font-normal text-ink-500">{option.sublabel}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
