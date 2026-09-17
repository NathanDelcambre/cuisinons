'use client';

import { UX_CATEGORIES, UX_CATEGORY_LABELS, type UxCategory } from '@cuisinons/shared';
import { useEffect, useRef, useState } from 'react';
import { Carrot } from 'lucide-react';
import { Chip, EmptyState, Modal, SearchInput, cn } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';

type Ingredient = {
  id: string;
  nameFr: string;
  iconUrl: string | null;
  uxCategory: UxCategory;
};

export function IngredientPicker({
  open,
  onPick,
  onClose,
}: {
  open: boolean;
  onPick: (ingredient: Ingredient) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('');
  const [items, setItems] = useState<Ingredient[]>([]);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    // Anti-rebond : la recherche part apres 180 ms sans frappe.
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      void apiJson<{ items: Ingredient[] }>(`/api/bff/ingredients?${params.toString()}`).then((data) => {
        setItems(data.items);
        setActive(0);
      });
    }, 180);
    return () => clearTimeout(handle);
  }, [open, query, category]);

  // Garde la ligne selectionnee au clavier dans la zone visible.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <Modal open={open} title="Choisir un ingrédient" onClose={onClose}>
      <SearchInput
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher (insensible aux accents)"
        aria-label="Rechercher un ingrédient"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((v) => Math.min(items.length - 1, v + 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((v) => Math.max(0, v - 1));
          }
          const target = items[active];
          if (e.key === 'Enter' && target) {
            e.preventDefault();
            onPick(target);
          }
        }}
      />

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-2">
        {[{ value: '', label: 'Tous' }, ...UX_CATEGORIES.map((c) => ({ value: c, label: UX_CATEGORY_LABELS[c] }))].map(
          (option) => (
            <Chip
              key={option.value}
              selected={category === option.value}
              onClick={() => setCategory(option.value)}
            >
              {option.label}
            </Chip>
          ),
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Carrot}
          title="Aucun ingrédient"
          description="Change de catégorie ou essaie un autre mot-clé."
          className="mt-2 py-10"
        />
      ) : (
        <ul ref={listRef} className="mt-1 max-h-72 space-y-1 overflow-y-auto">
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors duration-150 ease-out-soft',
                  index === active ? 'bg-ink-900 font-medium text-white' : 'text-ink-700 hover:bg-white/80',
                )}
              >
                {item.iconUrl ? (
                  <img src={item.iconUrl} alt="" width={28} height={28} className="size-7 shrink-0" />
                ) : (
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/30">
                    <Carrot className="size-4 opacity-60" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 truncate">{item.nameFr}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
