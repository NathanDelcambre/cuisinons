'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Check, Leaf, Search, Vegan } from 'lucide-react';
import {
  Button,
  Chip,
  EmptyState,
  Inset,
  Modal,
  SearchInput,
  Segmented,
  Select,
  Skeleton,
  Switch,
  cn,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import {
  DISH_KIND_LABELS,
  DISH_KINDS,
  MEAL_SLOT_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type MealRepeatUntil,
  type MealSlot,
  type RecipeListView,
  avatarUrlForEmail,
} from '@cuisinons/shared';
import { useAuth } from './auth-provider';
import { Avatar } from './avatar';
import { RecipeCover } from './recipe-cover';

type Recipe = { id: string; name: string; photoUrl?: string | null };
type User = { id: string; email?: string; displayName: string; avatarUrl?: string | null };

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const SORTS = [
  { value: 'date', label: 'Plus récentes' },
  { value: 'name', label: 'Nom' },
  { value: 'rating-desc', label: 'Mieux notées' },
  { value: 'rating-asc', label: 'Moins notées' },
  { value: 'protein-desc', label: 'Plus de protéines' },
  { value: 'protein-asc', label: 'Moins de protéines' },
  { value: 'carbs-desc', label: 'Plus de glucides' },
  { value: 'carbs-asc', label: 'Moins de glucides' },
  { value: 'kcal-desc', label: 'Plus de calories' },
  { value: 'kcal-asc', label: 'Moins de calories' },
];

function weekdayFromIso(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDay();
}

export function AddMealDialog({
  open,
  date,
  slot,
  replaceItemId,
  replaceScope = 'all',
  targetUserId,
  initialPortions,
  soloUserId,
  initialRecipeId,
  onClose,
  onAdded,
}: {
  open: boolean;
  date: string;
  slot: MealSlot;
  replaceItemId?: string | null;
  replaceScope?: 'me' | 'all';
  /** Convive visé quand on remplace seulement sa part. */
  targetUserId?: string | null;
  initialPortions?: Record<string, number> | null;
  /** Ajout à côté du repas de l'autre : lui laisser son plat. */
  soloUserId?: string | null;
  initialRecipeId?: string | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState('date');
  const [view, setView] = useState<RecipeListView>('mine');
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [portions, setPortions] = useState<Record<string, number>>({});
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [until, setUntil] = useState<MealRepeatUntil>('week');
  const repeatPanelRef = useRef<HTMLDivElement>(null);
  const replacing = Boolean(replaceItemId);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTag('');
    setSort('date');
    setView('mine');
    setRecipeId(initialRecipeId ?? null);
    setPortions(initialPortions ?? {});
    setRepeat(false);
    setWeekdays([weekdayFromIso(date)]);
    setUntil('week');
  }, [open, date, slot, initialRecipeId, initialPortions]);

  useEffect(() => {
    if (!repeat) return;
    repeatPanelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [repeat]);

  const recipes = useQuery({
    queryKey: ['recipes', query, tag, sort, view, slot],
    queryFn: () =>
      apiJson<Recipe[]>(
        `/api/bff/recipes?q=${encodeURIComponent(query)}&tag=${encodeURIComponent(tag)}&sort=${sort}&view=${view}&slot=${slot}`,
      ),
    enabled: open,
    staleTime: 120_000,
    placeholderData: keepPreviousData,
  });
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => apiJson<User[]>('/api/bff/users'),
    enabled: open,
  });
  function portionOf(userId: string) {
    if (userId in portions) return portions[userId] ?? 0;
    if (initialPortions) return initialPortions[userId] ?? 0;
    if (soloUserId) return userId === soloUserId ? 1 : 0;
    return 1;
  }

  const subjectId = targetUserId ?? user?.id ?? '';
  const shownUsers =
    replacing && replaceScope === 'me'
      ? (users.data ?? []).filter((person) => person.id === subjectId)
      : (users.data ?? []);

  const add = useMutation({
    mutationFn: () => {
      const household = users.data ?? [];
      const portionsPayload = household.map((u) => ({
        userId: u.id,
        portions: portionOf(u.id),
      }));
      if (replaceItemId && replaceScope === 'me') {
        return apiJson(`/api/bff/planner/items/${replaceItemId}/replace-for-me`, {
          method: 'POST',
          body: JSON.stringify({
            recipeId,
            portions: portionOf(subjectId) || 1,
            userId: subjectId,
          }),
        });
      }
      if (replaceItemId) {
        return apiJson(`/api/bff/planner/items/${replaceItemId}`, {
          method: 'PATCH',
          body: JSON.stringify({ recipeId, kind: 'RECIPE', portions: portionsPayload }),
        });
      }
      return apiJson('/api/bff/planner/items', {
        method: 'POST',
        body: JSON.stringify({
          date,
          slot,
          recipeId,
          portions: portionsPayload,
          ...(repeat && weekdays.length > 0 ? { repeat: { weekdays, until } } : {}),
        }),
      });
    },
    onSuccess: async () => {
      onAdded();
      await queryClient.invalidateQueries({ queryKey: ['planner'] });
      onClose();
    },
  });

  const list = recipes.data ?? [];

  return (
    <Modal
      open={open}
      size="xl"
      className="h-[min(88dvh,40rem)]"
      title={`${replacing ? 'Changer de recette' : 'Ajouter'} · ${MEAL_SLOT_LABELS[slot]}`}
      description={new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}
      onClose={onClose}
      bodyClassName="flex flex-col overflow-hidden"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            icon={Check}
            disabled={
              !recipeId ||
              shownUsers.length === 0 ||
              shownUsers.every((u) => portionOf(u.id) <= 0) ||
              (repeat && weekdays.length === 0)
            }
            loading={add.isPending}
            onClick={() => add.mutate()}
          >
            {replacing ? 'Remplacer' : 'Ajouter au planning'}
          </Button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="w-full min-w-0 sm:max-w-sm">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une recette"
              aria-label="Rechercher une recette"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:min-w-0 sm:flex-1 sm:justify-end sm:gap-5">
            {shownUsers.map((u) => {
              const amount = portionOf(u.id);
              const setAmount = (next: number) =>
                setPortions((current) => ({
                  ...current,
                  [u.id]: Math.round(Math.min(6, Math.max(0, next)) * 100) / 100,
                }));
              return (
                <div
                  key={u.id}
                  className="flex h-11 items-center rounded-xl border border-ink-200 bg-ink-100 px-1.5"
                >
                  <Avatar
                    name={u.displayName}
                    src={u.avatarUrl ?? (u.email ? avatarUrlForEmail(u.email) : null)}
                    className={cn(
                      'size-7 rounded-full text-[10px]',
                      amount <= 0 && 'opacity-35',
                    )}
                  />
                  <button
                    type="button"
                    className="flex size-5 items-center justify-center text-base leading-none text-ink-500 hover:text-ink-900 disabled:opacity-30"
                    aria-label={`Diminuer les portions de ${u.displayName}`}
                    disabled={amount <= 0}
                    onClick={() => setAmount(amount - 0.5)}
                  >
                    −
                  </button>
                  <span className="tabular min-w-4 text-center text-sm font-medium leading-none text-ink-900">
                    {amount.toLocaleString('fr-FR')}
                  </span>
                  <button
                    type="button"
                    className="flex size-5 items-center justify-center text-base leading-none text-ink-500 hover:text-ink-900 disabled:opacity-30"
                    aria-label={`Augmenter les portions de ${u.displayName}`}
                    disabled={amount >= 6}
                    onClick={() => setAmount(amount + 0.5)}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={tag}
            aria-label="Type de repas"
            className="h-11 min-h-11 min-w-0 flex-1"
            options={[
              { value: '', label: 'Tous les repas' },
              {
                value: 'vegetarien',
                label: 'Végétarien',
                icon: <Leaf className="size-4 text-sage-400" aria-hidden />,
              },
              {
                value: 'vegan',
                label: 'Vegan',
                icon: <Vegan className="size-4 text-sage-700" aria-hidden />,
              },
              ...DISH_KINDS.map((slug) => ({ value: slug, label: DISH_KIND_LABELS[slug] })),
            ]}
            onChange={setTag}
          />
          <Select
            value={sort}
            aria-label="Trier"
            className="h-11 min-h-11 min-w-0 flex-1"
            options={SORTS}
            onChange={setSort}
          />
          <Segmented
            label="Vue des recettes"
            className="hidden h-11 sm:inline-flex sm:w-auto sm:shrink-0"
            value={view}
            onChange={setView}
            options={[
              { value: 'mine', label: 'Mes recettes' },
              { value: 'ideas', label: 'Idées' },
            ]}
          />
        </div>
        <Inset className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain',
              recipes.isFetching && recipes.isPlaceholderData && 'opacity-60',
            )}
          >
            {recipes.isLoading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-36" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Aucune recette trouvée"
                description="Essaie un autre mot-clé ou un autre type de repas."
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((recipe) => {
                  const selected = recipeId === recipe.id;
                  return (
                    <li key={recipe.id} className="min-w-0">
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setRecipeId(recipe.id)}
                        className={cn(
                          'relative flex h-full w-full flex-col overflow-hidden rounded-md border text-left transition duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
                          selected
                            ? 'border-ink-900 bg-white ring-2 ring-ink-900'
                            : 'border-white/80 bg-white/70 hover:border-ink-300 hover:bg-white hover:shadow-soft',
                        )}
                      >
                        <RecipeCover src={recipe.photoUrl} className="aspect-[2/1] rounded-none" />
                        <span className="line-clamp-2 h-11 shrink-0 px-2 py-1.5 text-xs font-medium leading-4 text-ink-900">
                          {recipe.name}
                        </span>
                        {selected ? (
                          <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-ink-900 text-white">
                            <Check className="size-3.5" aria-hidden />
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Inset>
      </div>

      {!replacing ? (
        <div className="mt-4 shrink-0 space-y-3 border-t border-white/70 pt-4">
          <Switch
            checked={repeat}
            onChange={(next) => {
              setRepeat(next);
              if (next && weekdays.length === 0) setWeekdays([weekdayFromIso(date)]);
            }}
            label="Répéter"
            className="w-full justify-between"
          />
          {repeat ? (
            <div ref={repeatPanelRef} className="space-y-3">
              <div className="flex gap-1.5">
                {WEEKDAY_ORDER.map((day) => {
                  const selected = weekdays.includes(day);
                  const startDay = weekdayFromIso(date);
                  return (
                    <Chip
                      key={day}
                      selected={selected}
                      aria-label={WEEKDAY_LABELS[day].name}
                      className="h-10 min-w-0 flex-1 justify-center px-0"
                      onClick={() =>
                        setWeekdays((current) => {
                          if (day === startDay && current.includes(day)) return current;
                          return current.includes(day)
                            ? current.filter((item) => item !== day)
                            : [...current, day];
                        })
                      }
                    >
                      {WEEKDAY_LABELS[day].short}
                    </Chip>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip
                  selected={weekdays.length === 7}
                  onClick={() => setWeekdays(ALL_WEEKDAYS)}
                  className="shrink-0"
                >
                  Tous les jours
                </Chip>
                <Segmented
                  label="Répéter"
                  className="ml-auto h-10 [&_button]:whitespace-nowrap"
                  value={until}
                  onChange={setUntil}
                  options={[
                    { value: 'week', label: 'Cette semaine' },
                    { value: 'following', label: 'Toutes les suivantes' },
                  ]}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
