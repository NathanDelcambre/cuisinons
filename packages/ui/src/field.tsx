'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Minus, Plus, Search, type LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './button';

const control =
  'w-full rounded-xl border border-white/80 bg-white/75 text-sm text-ink-900 shadow-soft transition duration-200 ease-out-soft placeholder:text-ink-400 hover:bg-white/90 focus:bg-white disabled:opacity-55';

/** Etiquette, aide et message d'erreur relies au champ par aria-describedby. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      {children({ id, describedBy })}
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-tomato-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon;
  suffix?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon: Icon, suffix, className, ...props },
  ref,
) {
  if (!Icon && !suffix) {
    return <input ref={ref} className={cn(control, 'h-11 px-4', className)} {...props} />;
  }
  return (
    <span
      className={cn(
        control,
        'flex h-11 items-center gap-2 px-4 focus-within:bg-white',
        props.disabled && 'opacity-55',
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0 text-ink-400" aria-hidden /> : null}
      <input
        ref={ref}
        className={cn(
          'h-full min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          className,
        )}
        {...props}
      />
      {suffix ? <span className="shrink-0 text-sm text-ink-400">{suffix}</span> : null}
    </span>
  );
});

/** Champ de recherche : meme composant, mais l'icone et le type sont imposes. */
export const SearchInput = forwardRef<HTMLInputElement, Omit<InputProps, 'icon' | 'type'>>(
  function SearchInput(props, ref) {
    return <Input ref={ref} type="search" icon={Search} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(control, 'min-h-24 resize-y px-4 py-3', className)} {...props} />;
  },
);

/**
 * Incrementeur. Les deux boutons portent un libelle explicite, car « + » et
 * « − » ne sont pas annonces utilement par un lecteur d'ecran.
 */
export function Stepper({
  value,
  onChange,
  step = 0.5,
  min = step,
  max,
  suffix,
  labelDecrease = 'Diminuer',
  labelIncrease = 'Augmenter',
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: ReactNode;
  labelDecrease?: string;
  labelIncrease?: string;
  className?: string;
}) {
  // Les pas de 0,5 accumulent des erreurs en virgule flottante (0,30000000004).
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <IconButton
        icon={Minus}
        label={labelDecrease}
        size="sm"
        onClick={() => onChange(round(Math.max(min, value - step)))}
        disabled={value <= min}
      />
      <span className="tabular min-w-20 text-center text-sm font-medium text-ink-900">
        {value.toLocaleString('fr-FR')} {suffix}
      </span>
      <IconButton
        icon={Plus}
        label={labelIncrease}
        size="sm"
        onClick={() => onChange(round(max === undefined ? value + step : Math.min(max, value + step)))}
        disabled={max !== undefined && value >= max}
      />
    </div>
  );
}
