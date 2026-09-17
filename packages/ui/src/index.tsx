import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

const glass =
  'bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_10px_40px_rgba(31,41,51,0.06)] supports-[not(backdrop-filter)]:bg-white/95';

export function GlassCard({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`rounded-[28px] ${glass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function GlassPanel({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`rounded-[32px] ${glass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function GlassButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-full px-5 py-2.5 text-sm font-medium text-stone-900 ${glass} transition hover:bg-white/90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GlassModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm" onClick={onClose} aria-label="Fermer" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 w-full max-w-lg p-6 ${glass} rounded-[32px]`}
      >
        <h2 id="modal-title" className="mb-4 text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
