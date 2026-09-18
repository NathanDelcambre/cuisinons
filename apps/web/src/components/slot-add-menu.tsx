'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Ban, CalendarCheck, ChefHat, Cookie, Moon, Plus, Sun, Sunrise, Utensils, type LucideIcon } from 'lucide-react';
import { Button, IconButton, cn, transitions } from '@cuisinons/ui';
import { MEAL_KIND_LABELS, MEAL_SLOT_LABELS, type MealKind, type MealSlot } from '@cuisinons/shared';

export const SLOT_CHROME: Record<
  MealSlot,
  { icon: LucideIcon; border: string; tint: string; iconClass: string; labelClass: string; rail: string }
> = {
  BREAKFAST: {
    icon: Sunrise,
    border: 'border-gold-300/65 hover:border-gold-400',
    tint: 'bg-gold-200/22 hover:bg-gold-200/40',
    iconClass: 'bg-gold-200/75 text-gold-500',
    labelClass: 'text-gold-500',
    rail: 'border-l-[3px] border-l-gold-300',
  },
  LUNCH: {
    icon: Sun,
    border: 'border-sage-300/80 hover:border-sage-400',
    tint: 'bg-sage-50/70 hover:bg-sage-100/80',
    iconClass: 'bg-sage-100 text-sage-600',
    labelClass: 'text-sage-600',
    rail: 'border-l-[3px] border-l-sage-400',
  },
  SNACK: {
    icon: Cookie,
    border: 'border-peach-400/55 hover:border-peach-400',
    tint: 'bg-peach-200/20 hover:bg-peach-200/40',
    iconClass: 'bg-peach-200/70 text-peach-400',
    labelClass: 'text-peach-400',
    rail: 'border-l-[3px] border-l-peach-400',
  },
  DINNER: {
    icon: Moon,
    border: 'border-ink-300/90 hover:border-ink-400',
    tint: 'bg-ink-100/50 hover:bg-ink-100/80',
    iconClass: 'bg-ink-100 text-ink-600',
    labelClass: 'text-ink-600',
    rail: 'border-l-[3px] border-l-ink-400',
  },
};

export type SpecialMealKind = Exclude<MealKind, 'RECIPE'>;

const SPECIALS: Array<{ kind: SpecialMealKind; icon: LucideIcon }> = [
  { kind: 'RESTAURANT', icon: Utensils },
  { kind: 'IMPOSED', icon: CalendarCheck },
  { kind: 'SKIPPED', icon: Ban },
];

type MenuPos = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
};

export function SlotAddMenu({
  slot,
  variant,
  pending,
  onChooseRecipe,
  onChooseKind,
}: {
  slot: MealSlot;
  variant: 'empty' | 'plus';
  pending?: boolean;
  onChooseRecipe: () => void;
  onChooseKind: (kind: SpecialMealKind) => void;
}) {
  const slotLabel = MEAL_SLOT_LABELS[slot];
  const chrome = SLOT_CHROME[slot];
  const SlotIcon = chrome.icon;
  const reactId = useId();
  const menuId = `${reactId}-menu`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const width = 252;
    const viewportPad = 12;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const spaceAbove = rect.top - viewportPad;
    const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    let left = rect.right - width;
    if (left + width > window.innerWidth - viewportPad) {
      left = window.innerWidth - viewportPad - width;
    }
    if (left < viewportPad) left = viewportPad;
    setPos({
      top: placeAbove ? undefined : rect.bottom + gap,
      bottom: placeAbove ? window.innerHeight - rect.top + gap : undefined,
      left,
      width,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    setHighlighted(0);
    updatePosition();
  }, [open, updatePosition]);

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
    itemRefs.current[highlighted]?.focus();
  }, [highlighted, open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function chooseRecipe() {
    close();
    onChooseRecipe();
  }

  function chooseKind(kind: SpecialMealKind) {
    close();
    onChooseKind(kind);
  }

  function moveHighlight(delta: number) {
    setHighlighted((current) => (current + delta + 4) % 4);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (pending) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setHighlighted(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setHighlighted(3);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  const triggerLabel =
    variant === 'empty'
      ? `Ajouter un repas au ${slotLabel.toLowerCase()}`
      : `Ajouter au ${slotLabel.toLowerCase()}`;

  return (
    <>
      {variant === 'empty' ? (
        <button
          ref={triggerRef}
          type="button"
          disabled={pending}
          aria-label={triggerLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            'group flex h-full min-h-[5.25rem] w-full items-center gap-2.5 rounded-xl border border-dashed px-3 text-left transition-colors duration-200 ease-out-soft',
            chrome.border,
            chrome.tint,
          )}
        >
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full',
              chrome.iconClass,
            )}
          >
            <SlotIcon className="size-4" aria-hidden />
          </span>
          <span className={cn('min-w-0 flex-1 text-[11px] font-medium', chrome.labelClass)}>
            {slotLabel}
          </span>
          <Plus className="size-3.5 shrink-0 text-ink-300 transition-colors group-hover:text-sage-600" aria-hidden />
        </button>
      ) : (
        <IconButton
          ref={triggerRef}
          icon={Plus}
          label={triggerLabel}
          size="sm"
          variant="ghost"
          disabled={pending}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={onTriggerKeyDown}
        />
      )}

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open && pos ? (
                <motion.div
                  ref={listRef}
                  id={menuId}
                  role="menu"
                  aria-label={`Type de repas · ${slotLabel}`}
                  tabIndex={-1}
                  onKeyDown={onMenuKeyDown}
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
                    zIndex: 70,
                  }}
                  className={cn(
                    'glass-raised rounded-2xl p-2',
                    pos.bottom ? 'origin-bottom' : 'origin-top',
                  )}
                >
                  <Button
                    ref={(node) => {
                      itemRefs.current[0] = node;
                    }}
                    role="menuitem"
                    icon={ChefHat}
                    block
                    tabIndex={highlighted === 0 ? 0 : -1}
                    onMouseEnter={() => setHighlighted(0)}
                    onClick={chooseRecipe}
                  >
                    Choisir une recette
                  </Button>
                  <div className="mt-1.5 space-y-0.5">
                    {SPECIALS.map((option, index) => {
                      const itemIndex = index + 1;
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.kind}
                          ref={(node) => {
                            itemRefs.current[itemIndex] = node;
                          }}
                          type="button"
                          role="menuitem"
                          tabIndex={highlighted === itemIndex ? 0 : -1}
                          onMouseEnter={() => setHighlighted(itemIndex)}
                          onClick={() => chooseKind(option.kind)}
                          className={cn(
                            'flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition-colors duration-150 ease-out-soft',
                            highlighted === itemIndex
                              ? 'bg-white/80 text-ink-900'
                              : 'text-ink-600',
                          )}
                        >
                          <Icon className="size-4 shrink-0 text-ink-400" aria-hidden />
                          {MEAL_KIND_LABELS[option.kind]}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
