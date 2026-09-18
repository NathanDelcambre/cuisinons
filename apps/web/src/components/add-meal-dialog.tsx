'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button, EmptyState, Modal, SearchInput, Skeleton, Stepper, cn } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { MEAL_SLOT_LABELS, type MealSlot, avatarUrlForEmail } from '@cuisinons/shared';
import { useAuth } from './auth-provider';
import { Avatar } from './avatar';

type Recipe = { id: string; name: string };
type User = { id: string; email?: string; displayName: string; avatarUrl?: string | null };

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
  const replacing = Boolean(replaceItemId);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setRecipeId(initialRecipeId ?? null);
    setPortions({});
  }, [open, date, slot, initialRecipeId]);

  const recipes = useQuery({
    queryKey: ['recipes', query, slot],
    queryFn: () =>
      apiJson<Recipe[]>(`/api/bff/recipes?q=${encodeURIComponent(query)}&slot=${slot}`),
    enabled: open,
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
              (users.data ?? []).every((u) => (portions[u.id] ?? 1) <= 0)
            }
            loading={add.isPending}
            onClick={() => add.mutate()}
          >
            {replacing ? 'Remplacer' : 'Ajouter au planning'}
          </Button>
        </>
      }
    >
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une recette"
        aria-label="Rechercher une recette"
      />

      <div className="mt-3 max-h-56 overflow-y-auto">
        {recipes.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Aucune recette trouvée"
            description="Essaie un autre mot-clé."
            className="py-8"
          />
        ) : (
          <ul className="space-y-1">
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
                        : 'text-ink-700 hover:bg-white/80',
                    )}
                  >
                    <span className="min-w-0 truncate">{recipe.name}</span>
                    {selected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-5 space-y-3 border-t border-white/70 pt-5">
        <p className="text-sm font-medium text-ink-700">Portions</p>
        {(users.data ?? []).map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2.5">
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
              value={portions[u.id] ?? 1}
              onChange={(next) => setPortions((p) => ({ ...p, [u.id]: next }))}
              step={0.5}
              min={0}
              max={6}
              suffix="portion"
              labelDecrease={`Diminuer les portions de ${u.displayName}`}
              labelIncrease={`Augmenter les portions de ${u.displayName}`}
            />
          </div>
        ))}
        {(users.data ?? []).length >= 2 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {(users.data ?? []).map((u) => (
              <Button
                key={`only-${u.id}`}
                type="button"
                size="sm"
                variant="glass"
                onClick={() => {
                  const next: Record<string, number> = {};
                  for (const other of users.data ?? []) {
                    next[other.id] = other.id === u.id ? 1 : 0;
                  }
                  setPortions(next);
                }}
              >
                {u.id === user?.id ? 'Pour moi seulement' : `Pour ${u.displayName} seulement`}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
