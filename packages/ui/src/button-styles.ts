import { cn } from './cn';

/**
 * Styles du bouton, isoles dans un module sans « use client » : un composant
 * serveur (une page d'erreur, par exemple) doit pouvoir styler un lien sans
 * importer de code client, ce qui echouerait au prerendu.
 */
export type ButtonVariant = 'primary' | 'accent' | 'glass' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const buttonBase =
  'relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition duration-200 ease-out-soft active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 disabled:pointer-events-none disabled:opacity-55';

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink-900 text-white shadow-soft hover:bg-ink-800',
  accent: 'bg-sage-500 text-white shadow-soft hover:bg-sage-600',
  glass: 'glass text-ink-900 hover:bg-white/90',
  ghost: 'text-ink-600 hover:bg-ink-900/5 hover:text-ink-900',
  danger: 'bg-tomato-500 text-white shadow-soft hover:bg-tomato-600',
};

/** min-h-11 vaut 44 px : la cible tactile minimale recommandee. */
export const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 min-h-9 px-3.5 text-[13px]',
  md: 'h-11 min-h-11 px-5 text-sm',
  lg: 'h-12 min-h-12 px-6 text-[15px]',
};

export const buttonIconSizes: Record<ButtonSize, string> = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-[18px]',
};

export const iconButtonSizes: Record<ButtonSize, string> = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-12',
};

/**
 * Meme apparence qu'un Button, pour un element qui doit rester un lien.
 * Un bouton qui navigue casse l'ouverture dans un nouvel onglet et le survol
 * de l'URL : on style un `Link` plutot que d'appeler le routeur a la main.
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}): string {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], block && 'w-full', className);
}
