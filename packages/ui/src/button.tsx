'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from './cn';
import {
  buttonBase,
  buttonIconSizes,
  buttonSizes,
  buttonVariants,
  iconButtonSizes,
  type ButtonSize,
  type ButtonVariant,
} from './button-styles';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconEnd?: LucideIcon;
  loading?: boolean;
  block?: boolean;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconEnd: IconEnd,
    loading = false,
    block = false,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const glyph = buttonIconSizes[size];
  return (
    <button
      ref={ref}
      // Le libelle reste en place pendant le chargement : seule l'icone change,
      // donc le bouton ne change pas de largeur et la mise en page ne saute pas.
      aria-busy={loading || undefined}
      disabled={disabled ?? loading}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], block && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(glyph, 'animate-spin')} aria-hidden />
      ) : Icon ? (
        <Icon className={glyph} aria-hidden />
      ) : null}
      {children}
      {IconEnd && !loading ? <IconEnd className={glyph} aria-hidden /> : null}
    </button>
  );
});

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon;
  /** Obligatoire : le bouton n'a aucun texte pour les lecteurs d'ecran. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'glass', size = 'md', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(buttonBase, buttonVariants[variant], iconButtonSizes[size], 'p-0', className)}
      {...props}
    >
      <Icon className={buttonIconSizes[size]} aria-hidden />
    </button>
  );
});
