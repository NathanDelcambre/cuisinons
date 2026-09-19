'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './cn';
import { transitions } from './motion';
import { IconButton } from './button';

/**
 * Feuille modale : ancree en bas sur mobile, centree au-dela. Rendue dans un
 * portail sur `body`, sinon une animation `transform` sur un parent redefinirait
 * le referentiel de `position: fixed` et decalerait la modale.
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  footer,
  children,
  className,
  bodyClassName,
  footerClassName,
  size = 'md',
  chrome = 'default',
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  size?: 'md' | 'xl' | '2xl';
  /** `bare` : pas d’en-tête standard, pour une photo plein cadre ou un chrome custom. */
  chrome?: 'default' | 'bare';
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    // Empeche le defilement de l'arriere-plan pendant l'ouverture.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overscroll-none p-3 sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transitions.quick}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn(
              'glass-raised relative z-10 flex w-full flex-col overflow-hidden rounded-3xl focus:outline-none',
              size === '2xl'
                ? 'max-h-[min(92dvh,56rem)] max-w-5xl bg-[rgba(255,252,247,0.97)]'
                : size === 'xl'
                  ? 'max-h-[min(92dvh,56rem)] max-w-3xl bg-[rgba(255,252,247,0.97)]'
                  : 'max-h-[88dvh] max-w-lg',
              className,
            )}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={transitions.spring}
          >
            {chrome === 'default' ? (
              <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6">
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
                    {title}
                  </h2>
                  {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
                </div>
                <IconButton icon={X} label="Fermer" size="sm" variant="ghost" onClick={onClose} />
              </div>
            ) : null}
            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-none',
                chrome === 'default' && 'px-6 pt-5 pb-6',
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer ? (
              <div
                className={cn(
                  'flex w-full shrink-0 flex-wrap items-center justify-end gap-2 border-t border-white/70 bg-white/55 px-6 py-4',
                  footerClassName,
                )}
              >
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
