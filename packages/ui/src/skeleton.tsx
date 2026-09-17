import { cn } from './cn';

/**
 * Bloc d'attente. On affiche la forme du contenu a venir plutot qu'un texte
 * « Chargement… », ce qui evite un saut de mise en page a l'arrivee des donnees.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-shimmer rounded-xl bg-[linear-gradient(90deg,rgba(28,25,23,0.05)_0%,rgba(28,25,23,0.10)_50%,rgba(28,25,23,0.05)_100%)] bg-[length:200%_100%]',
        className,
      )}
    />
  );
}
