'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';
import { transitions } from './motion';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type MenuPos = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Liste deroulante custom : le menu natif du navigateur casse le verre, les
 * rayons et la typo. Celle-ci reprend les cartes de l'interface, se positionne
 * en portail (pour ne pas etre coupee) et reste pilotable au clavier.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  id,
  disabled,
  placeholder = 'Choisir',
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: {
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (next: T) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}) {
  const reactId = useId();
  const listId = `${reactId}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const searchRef = useRef({ query: '', at: 0 });

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [highlighted, setHighlighted] = useState(selectedIndex);

  const selected = options.find((option) => option.value === value);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const minWidth = Math.max(rect.width, 176);
    const viewportPad = 12;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;
    const placeAbove = spaceBelow < 168 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(288, Math.max(120, (placeAbove ? spaceAbove : spaceBelow) - gap));
    let left = rect.left;
    if (left + minWidth > window.innerWidth - viewportPad) {
      left = window.innerWidth - viewportPad - minWidth;
    }
    if (left < viewportPad) left = viewportPad;
    setPos({
      top: placeAbove ? undefined : rect.bottom + gap,
      bottom: placeAbove ? window.innerHeight - rect.top + gap : undefined,
      left,
      width: minWidth,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    setHighlighted(selectedIndex);
    updatePosition();
  }, [open, selectedIndex, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[highlighted]?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
  }

  function moveHighlight(delta: number) {
    if (options.length === 0) return;
    setHighlighted((current) => (current + delta + options.length) % options.length);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Home' && open) {
      event.preventDefault();
      setHighlighted(0);
      return;
    }
    if (event.key === 'End' && open) {
      event.preventDefault();
      setHighlighted(options.length - 1);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      choose(highlighted);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab' && open) {
      setOpen(false);
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      const nextQuery =
        now - searchRef.current.at > 450 ? event.key : `${searchRef.current.query}${event.key}`;
      searchRef.current = { query: nextQuery, at: now };
      const needle = fold(nextQuery);
      const match = options.findIndex((option) => fold(option.label).startsWith(needle));
      if (match >= 0) {
        if (!open) setOpen(true);
        setHighlighted(match);
      }
    }
  }

  const highlightedId = open ? `${listId}-opt-${String(highlighted)}` : undefined;

  return (
    <span className={cn('relative inline-flex w-full', className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={highlightedId}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        className={cn(
          'flex h-11 min-h-11 min-w-0 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-ink-200 bg-ink-100 pr-3 text-left text-sm text-ink-900 transition duration-200 ease-out-soft hover:border-ink-300 hover:bg-white focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 disabled:cursor-not-allowed disabled:opacity-55',
          selected?.icon ? 'pl-3' : 'pl-4',
          open && 'bg-white ring-2 ring-sage-300',
          className,
        )}
      >
        <span className={cn('flex min-w-0 flex-1 items-center gap-2', !selected && 'text-ink-400')}>
          {selected?.icon ? (
            <span className="flex size-4 shrink-0 items-center justify-center text-ink-500">{selected.icon}</span>
          ) : null}
          <span className="min-w-0 truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-ink-400 transition-transform duration-200 ease-out-soft',
            open && 'rotate-180',
          )}
        />
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open && pos ? (
                <motion.div
                  ref={listRef}
                  id={listId}
                  role="listbox"
                  aria-label={ariaLabel}
                  aria-labelledby={ariaLabelledBy}
                  tabIndex={-1}
                  initial={{ opacity: 0, y: pos.bottom ? 8 : -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: pos.bottom ? 6 : -6, scale: 0.98 }}
                  transition={transitions.quick}
                  style={{
                    position: 'fixed',
                    top: pos.top,
                    bottom: pos.bottom,
                    left: pos.left,
                    width: pos.width,
                    maxHeight: pos.maxHeight,
                    zIndex: 70,
                  }}
                  className={cn(
                    'glass-raised overflow-y-auto overscroll-contain rounded-2xl p-1.5',
                    pos.bottom ? 'origin-bottom' : 'origin-top',
                  )}
                >
                  {options.map((option, index) => {
                    const active = option.value === value;
                    const hovered = index === highlighted;
                    return (
                      <div
                        key={option.value || `empty-${String(index)}`}
                        ref={(node) => {
                          optionRefs.current[index] = node;
                        }}
                        id={`${listId}-opt-${String(index)}`}
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setHighlighted(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => choose(index)}
                        className={cn(
                          'flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-sm transition-colors duration-150 ease-out-soft',
                          hovered ? 'bg-white/80 text-ink-900' : 'text-ink-600',
                          active && 'font-medium text-ink-900',
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          {option.icon ? (
                            <span className="flex size-4 shrink-0 items-center justify-center text-ink-500">
                              {option.icon}
                            </span>
                          ) : null}
                          <span className="min-w-0 truncate">{option.label}</span>
                        </span>
                        {active ? <Check className="size-3.5 shrink-0 text-sage-600" aria-hidden /> : null}
                      </div>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </span>
  );
}
