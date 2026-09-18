'use client';

import { UX_CATEGORIES, UX_CATEGORY_LABELS, kitchenLabel, type UxCategory } from '@cuisinons/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Carrot, Loader2 } from 'lucide-react';
import { Chip, EmptyState, Modal, SearchInput, cn } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { CategoryIcon } from '@/components/category-icon';
import { IngredientIcon } from '@/components/ingredient-icon';

type Ingredient = {
  id: string;
  nameFr: string;
  iconUrl: string | null;
  uxCategory: UxCategory;
};

type SearchPage = { items: Ingredient[]; nextCursor: string | null };

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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const nextCursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const genRef = useRef(0);

  const fetchPage = useCallback(
    async (input: { query: string; category: string; cursor: string | null; signal: AbortSignal; reset: boolean }) => {
      if (loadingRef.current && !input.reset) return;
      const gen = genRef.current;
      loadingRef.current = true;
      setLoading(true);
      const params = new URLSearchParams();
      if (input.query) params.set('q', input.query);
      if (input.category) params.set('category', input.category);
      if (input.cursor) params.set('cursor', input.cursor);
      try {
        const data = await apiJson<SearchPage>(`/api/bff/ingredients?${params.toString()}`, {
          signal: input.signal,
        });
        if (input.signal.aborted || gen !== genRef.current) return;
        setItems((current) => (input.reset ? data.items : [...current, ...data.items]));
        setNextCursor(data.nextCursor);
        nextCursorRef.current = data.nextCursor;
        if (input.reset) setActive(0);
      } catch (error) {
        if (input.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
      } finally {
        if (gen === genRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    genRef.current += 1;
    loadingRef.current = false;
    setItems([]);
    setNextCursor(null);
    nextCursorRef.current = null;
    const handle = setTimeout(() => {
      void fetchPage({
        query,
        category,
        cursor: null,
        signal: controller.signal,
        reset: true,
      });
    }, 180);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [open, query, category, fetchPage]);

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  useEffect(() => {
    if (!open || !nextCursor) return;
    const root = listRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || !nextCursorRef.current || loadingRef.current) return;
        void fetchPage({
          query,
          category,
          cursor: nextCursorRef.current,
          signal: new AbortController().signal,
          reset: false,
        });
      },
      { root, rootMargin: '120px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, nextCursor, query, category, fetchPage, items.length]);

  return (
    <Modal
      open={open}
      title="Choisir un ingrédient"
      onClose={onClose}
      className="h-[min(88dvh,36rem)]"
      bodyClassName="flex flex-col overflow-hidden"
    >
      <SearchInput
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un ingrédient"
        aria-label="Rechercher un ingrédient"
        className="focus-visible:outline-none"
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

      <div className="-mx-1 mt-3 shrink-0 flex gap-1.5 overflow-x-auto px-1 pb-2">
        {[{ value: '', label: 'Tous' }, ...UX_CATEGORIES.map((c) => ({ value: c, label: UX_CATEGORY_LABELS[c] }))].map(
          (option) => (
            <Chip
              key={option.value}
              selected={category === option.value}
              onClick={() => setCategory(option.value)}
            >
              {option.value ? <CategoryIcon category={option.value} className="size-4" /> : null}
              {option.label}
            </Chip>
          ),
        )}
      </div>

      {items.length === 0 && !loading ? (
        <EmptyState
          icon={Carrot}
          title="Aucun ingrédient"
          description="Change de catégorie ou essaie un autre mot-clé."
          className="mt-1 min-h-0 flex-1 py-6"
        />
      ) : (
        <ul ref={listRef} className="mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto">
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
                <IngredientIcon src={item.iconUrl} />
                <span className="min-w-0 truncate">{kitchenLabel(item.nameFr)}</span>
              </button>
            </li>
          ))}
          <li ref={sentinelRef} className="h-4" aria-hidden />
          {loading ? (
            <li className="flex justify-center py-2 text-ink-400">
              <Loader2 className="size-4 animate-spin" aria-label="Chargement" />
            </li>
          ) : null}
        </ul>
      )}
    </Modal>
  );
}
