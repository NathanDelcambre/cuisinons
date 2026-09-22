'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button, Chip, EmptyState, Inset, Modal, SearchInput, Segmented, Skeleton, Stepper, Switch, cn } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import {
  MEAL_SLOT_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
  type MealRepeatUntil,
  type MealSlot,
  avatarUrlForEmail,
} from '@cuisinons/shared';
import { useAuth } from './auth-provider';
import { Avatar } from './avatar';
import { SLOT_CHROME } from './slot-add-menu';

type Recipe = { id: string; name: string };
type User = { id: string; email?: string; displayName: string; avatarUrl?: string | null };

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function weekdayFromIso(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDay();
}

export function AddMealDialog({
  open,
  date,
  slot,
  replaceItemId,
  replaceScope = 'all',
  initialRecipeId,
  onClose,
  onAdded,
}: {
  open: boolean;
  date: string;
  slot: MealSlot;
  replaceItemId?: string | null;
  replaceScope?: 'me' | 'all';
  initialRecipeId?: string | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
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
    setRecipeId(initialRecipeId ?? null);
    setPortions({});
    setRepeat(false);
    setWeekdays([weekdayFromIso(date)]);
    setUntil('week');
  }, [open, date, slot, initialRecipeId]);

  useEffect(() => {
    if (!repeat) return;
    repeatPanelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [repeat]);

  const recipes = useQuery({
    queryKey: ['recipes', query, slot],
    queryFn: () =>
      apiJson<Recipe[]>(`/api/bff/recipes?q=${encodeURIComponent(query)}&slot=${slot}`),
    enabled: open,
    staleTime: 120_000,
  });
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => apiJson<User[]>('/api/bff/users'),
    enabled: open,
  });
  const add = useMutation({
    mutationFn: () => {
      const portionsPayload = (users.data ?? []).map((u) => ({
        userId: u.id,
        portions: portions[u.id] ?? 1,
      }));
      if (replaceItemId && replaceScope === 'me') {
        return apiJson(`/api/bff/planner/items/${replaceItemId}/replace-for-me`, {
          method: 'POST',
          body: JSON.stringify({
            recipeId,
            portions: portions[user?.id ?? ''] ?? 1,
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
  const slotChrome = SLOT_CHROME[slot];
  const SlotIcon = slotChrome.icon;

  return (
    <Modal
      open={open}
      title={`${replacing ? 'Changer de recette' : 'Ajouter'} · ${MEAL_SLOT_LABELS[slot]}`}
      description={new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            icon={Check}
            disabled={
              !recipeId ||
              (users.data ?? []).every((u) => (portions[u.id] ?? 1) <= 0) ||
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
      <Inset className="p-2">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une recette"
          aria-label="Rechercher une recette"
        />
        <div
          className={cn(
            'mt-2 overflow-y-auto',
            list.length > 0 || recipes.isLoading ? 'min-h-44 max-h-56' : 'max-h-56',
          )}
        >
          {recipes.isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Aucune recette trouvée"
              description="Essaie un autre mot-clé."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="space-y-0.5">
              {list.map((recipe) => {
                const selected = recipeId === recipe.id;
                return (
                  <li key={recipe.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setRecipeId(recipe.id)}
                      className={cn(
                        'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition duration-200 ease-out-soft',
                        selected
                          ? 'bg-ink-900 font-medium text-white'
                          : 'text-ink-800 hover:bg-white',
                      )}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span
                          aria-hidden
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-full',
                            selected ? 'bg-white/15 text-white' : slotChrome.iconClass,
                          )}
                        >
                          <SlotIcon className="size-4" />
                        </span>
                        <span className="min-w-0 truncate">{recipe.name}</span>
                      </span>
                      {selected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Inset>

      <div className="mt-5 space-y-3 border-t border-white/70 pt-5">
        <p className="text-sm font-medium text-ink-700">Portions</p>
        {(users.data ?? []).map((u) => {
          const amount = portions[u.id] ?? 1;
          const included = amount > 0;
          return (
            <div key={u.id} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={included}
                  aria-label={u.displayName}
                  onClick={() =>
                    setPortions((current) => ({
                      ...current,
                      [u.id]: included ? 0 : 1,
                    }))
                  }
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border transition duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
                    included
                      ? 'border-sage-500 bg-sage-500 text-white'
                      : 'border-ink-300 bg-white/70 hover:border-sage-400',
                  )}
                >
                  {included ? <Check className="size-3.5" aria-hidden /> : null}
                </button>
                <Avatar
                  name={u.displayName}
                  src={u.avatarUrl ?? (u.email ? avatarUrlForEmail(u.email) : null)}
                  className="size-8 rounded-full text-xs"
                />
                <span className="min-w-0 truncate text-sm text-ink-600">
                  {u.displayName}
                  {u.id === user?.id ? ' (toi)' : ''}
                </span>
              </span>
              <Stepper
                value={amount}
                onChange={(next) => setPortions((p) => ({ ...p, [u.id]: next }))}
                step={0.5}
                min={0}
                max={6}
                suffix="portion"
                labelDecrease={`Diminuer les portions de ${u.displayName}`}
                labelIncrease={`Augmenter les portions de ${u.displayName}`}
              />
            </div>
          );
        })}
      </div>

      {!replacing ? (
        <div className="mt-5 space-y-3 border-t border-white/70 pt-5">
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
