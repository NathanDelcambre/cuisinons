import type { ReactNode } from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * Ligne de navigation, facon reglages iOS : icone, libelle, sous-titre, chevron.
 * Presentationnel uniquement : l'appelant l'enveloppe dans un Link ou un bouton,
 * pour que ce paquet n'ait pas a dependre du routeur.
 */
export function NavRow({
  icon: Icon,
  label,
  description,
  trailing,
  className,
}: {
  icon?: LucideIcon;
  label: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'group glass flex items-center gap-4 rounded-2xl px-5 py-4 transition duration-200 ease-out-soft hover:bg-white/90',
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-600">
          <Icon className="size-4" aria-hidden />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-900">{label}</span>
        {description ? (
          <span className="mt-0.5 block truncate text-xs text-ink-500">{description}</span>
        ) : null}
      </span>
      {trailing}
      <ChevronRight
        className="size-4 shrink-0 text-ink-400 transition-transform duration-200 ease-out-soft group-hover:translate-x-0.5 group-hover:text-ink-600"
        aria-hidden
      />
    </div>
  );
}
