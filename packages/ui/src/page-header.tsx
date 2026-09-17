import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Entete de page. Les actions restent alignees a droite sur grand ecran et
 * passent sous le titre en dessous, sans jamais comprimer le titre.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-sm text-ink-500">{eyebrow}</p> : null}
        <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-ink-900 sm:text-[2rem]">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-prose text-sm text-ink-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
