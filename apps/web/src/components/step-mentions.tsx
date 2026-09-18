'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { insertIngredientToken, parseStepMentions } from '@cuisinons/shared';
import { Textarea, cn } from '@cuisinons/ui';

export type StepIngredientOption = {
  id: string;
  name: string;
};

export function StepDescriptionField({
  value,
  onChange,
  ingredients,
  label,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  ingredients: StepIngredientOption[];
  label: string;
  placeholder?: string;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ingredients.filter((item) => !needle || item.name.toLowerCase().includes(needle));
  }, [ingredients, query]);

  useLayoutEffect(() => {
    if (open) setHighlight(0);
  }, [open, query]);

  function pick(id: string) {
    const el = areaRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const next = insertIngredientToken(value, cursor, id);
    onChange(next.text);
    setOpen(false);
    setQuery('');
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Textarea
        ref={areaRef}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          const cursor = e.target.selectionStart ?? next.length;
          const typedSlash = next[cursor - 1] === '/' && value.length < next.length;
          onChange(next);
          if (typedSlash && ingredients.length > 0) {
            setOpen(true);
            setQuery('');
          } else if (open && !next.includes('/')) {
            setOpen(false);
          }
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(filtered.length - 1, h + 1));
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
            return;
          }
          if (e.key === 'Enter') {
            const target = filtered[highlight];
            if (target) {
              e.preventDefault();
              pick(target.id);
            }
          }
        }}
      />
      {open && ingredients.length > 0 ? (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-white/80 bg-white/95 p-1 shadow-soft"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer"
            aria-label="Filtrer les ingrédients de la recette"
            className="mb-1 h-9 w-full rounded-lg bg-ink-900/5 px-3 text-sm"
          />
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-500">Aucun ingrédient.</p>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={cn(
                  'flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm',
                  index === highlight ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-white',
                )}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => pick(item.id)}
              >
                {item.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function StepMentionPreview({
  description,
  ingredients,
  factor,
}: {
  description: string;
  ingredients: Array<{ id: string; name: string; quantity: number; unitLabel: string }>;
  factor: number;
}) {
  const byId = new Map(ingredients.map((item) => [item.id, item]));
  return (
    <p className="text-sm leading-relaxed text-ink-800">
      {parseStepMentions(description).map((part, index) => {
        if (part.type === 'text') return <span key={index}>{part.value}</span>;
        const item = byId.get(part.id);
        if (!item) return <span key={index}>{part.id}</span>;
        const qty = (item.quantity * factor).toLocaleString('fr-FR');
        const tip = `${item.name} · ${qty} ${item.unitLabel}`;
        return (
          <button
            key={index}
            type="button"
            title={tip}
            className="mx-0.5 inline rounded-md bg-sage-100 px-1.5 py-0.5 text-sage-700 underline-offset-2 hover:bg-sage-200"
          >
            {item.name}
          </button>
        );
      })}
    </p>
  );
}
