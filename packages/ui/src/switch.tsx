'use client';

import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from './cn';
import { transitions } from './motion';

/**
 * Bascule facon iOS. C'est un bouton `role="switch"` et non une case a cocher :
 * la pastille est animee, ce qu'un input natif ne permet pas de styler.
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium text-ink-900">
          {label}
        </label>
        {description ? <span className="mt-0.5 block text-xs text-ink-500">{description}</span> : null}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 disabled:opacity-55',
          checked ? 'bg-sage-500' : 'bg-ink-300',
        )}
      >
        <motion.span
          layout
          transition={transitions.spring}
          className={cn(
            'size-6 rounded-full bg-white shadow-soft',
            checked ? 'ml-auto' : 'mr-auto',
          )}
        />
      </button>
    </div>
  );
}
