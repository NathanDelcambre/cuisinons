import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type SurfaceProps = HTMLAttributes<HTMLDivElement> & { children?: ReactNode };

/** Conteneur standard : une carte de contenu posee sur le fond creme. */
export function Card({ className, children, ...props }: SurfaceProps) {
  return (
    <div className={cn('glass rounded-2xl p-5', className)} {...props}>
      {children}
    </div>
  );
}

/** Carte cliquable : le survol la souleve legerement. */
export function CardLink({ className, children, ...props }: SurfaceProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-5 transition duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-card',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Bloc de premier plan, plus opaque et plus arrondi : entetes, panneaux. */
export function Panel({ className, children, ...props }: SurfaceProps) {
  return (
    <div className={cn('glass-raised rounded-3xl p-6', className)} {...props}>
      {children}
    </div>
  );
}

/** Element imbrique dans une carte : il ne porte pas de flou, seulement un fond. */
export function Inset({ className, children, ...props }: SurfaceProps) {
  return (
    <div
      className={cn('rounded-xl border border-white/70 bg-white/75 p-3 shadow-soft', className)}
      {...props}
    >
      {children}
    </div>
  );
}
