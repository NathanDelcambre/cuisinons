'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Pastille a bascule : filtre, tag, ustensile. `aria-pressed` signale l'etat,
 * ce qu'un simple changement de couleur ne transmet pas aux lecteurs d'ecran.
 */
export function Chip({
  selected = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition duration-200 ease-out-soft active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
        selected ? 'bg-ink-900 text-white shadow-soft' : 'bg-white/80 text-ink-600 hover:bg-white',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
