'use client';

import { UX_CATEGORIES, UX_CATEGORY_LABELS, type UxCategory } from '@cuisinons/shared';
import { useEffect, useState } from 'react';
import { apiJson } from '@/lib/api';
import { GlassModal } from '@cuisinons/ui';

type Ingredient = {
  id: string;
  nameFr: string;
  iconUrl: string | null;
  uxCategory: UxCategory;
};

export function IngredientPicker({
  onPick,
  onClose,
}: {
  onPick: (ingredient: Ingredient) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('');
  const [items, setItems] = useState<Ingredient[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      void apiJson<{ items: Ingredient[] }>(`/api/bff/ingredients?${params.toString()}`).then((data) => {
        setItems(data.items);
        setActive(0);
      });
    }, 180);
    return () => clearTimeout(handle);
  }, [q, category]);

  return (
    <GlassModal title="Choisir un ingrédient" onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher (insensible aux accents)"
        className="w-full rounded-2xl border px-3 py-2"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((v) => Math.min(items.length - 1, v + 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((v) => Math.max(0, v - 1));
          }
          if (e.key === 'Enter' && items[active]) {
            onPick(items[active]);
          }
        }}
      />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        <button className={`rounded-full px-3 py-1 text-xs ${category === '' ? 'bg-stone-900 text-white' : 'bg-white'}`} onClick={() => setCategory('')}>
          Tous
        </button>
        {UX_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${category === cat ? 'bg-stone-900 text-white' : 'bg-white'}`}
            onClick={() => setCategory(cat)}
          >
            {UX_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
      <ul className="mt-3 max-h-72 overflow-auto">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${index === active ? 'bg-stone-900 text-white' : ''}`}
              onClick={() => onPick(item)}
            >
              {item.iconUrl ? <img src={item.iconUrl} alt="" className="size-8" /> : null}
              {item.nameFr}
            </button>
          </li>
        ))}
      </ul>
    </GlassModal>
  );
}
