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
  actionsBesideTitle = false,
  actionsClassName,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Garde le bouton sur la ligne du titre, même sur mobile. */
  actionsBesideTitle?: boolean;
  actionsClassName?: string;
}) {
  if (actionsBesideTitle) {
    return (
      <header className={cn('flex flex-col gap-2', className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <p className="mb-1 text-sm text-ink-500">{eyebrow}</p> : null}
            <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-ink-900 sm:text-[2rem]">
              {title}
            </h1>
          </div>
          {actions ? <div className={cn('shrink-0', actionsClassName)}>{actions}</div> : null}
        </div>
        {description ? <div className="max-w-prose text-sm text-ink-500">{description}</div> : null}
      </header>
    );
  }
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-3', className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-sm text-ink-500">{eyebrow}</p> : null}
        <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-ink-900 sm:text-[2rem]">
          {title}
        </h1>
        {description ? <div className="mt-2 text-sm text-ink-500">{description}</div> : null}
      </div>
      {actions ? (
        <div className={cn('flex shrink-0 flex-wrap items-center gap-2', actionsClassName)}>{actions}</div>
      ) : null}
    </header>
  );
}
