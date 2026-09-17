import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Chaque composant expose `className` pour permettre un ajustement ponctuel.
 * twMerge garantit qu'une classe passee par l'appelant remplace celle du
 * composant au lieu de s'y ajouter : sans lui, `p-6` et `p-3` coexisteraient et
 * le gagnant dependrait de l'ordre de la feuille de style.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
