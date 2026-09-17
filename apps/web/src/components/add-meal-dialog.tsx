'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiJson } from '@/lib/api';
import { useAuth } from './auth-provider';
import { MEAL_SLOT_LABELS, type MealSlot } from '@cuisinons/shared';
import { GlassModal } from '@cuisinons/ui';

type Recipe = { id: string; name: string };
type User = { id: string; displayName: string };

export function AddMealDialog({
  date,
  slot,
  onClose,
  onAdded,
}: {
  date: string;
  slot: MealSlot;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const recipes = useQuery({
    queryKey: ['recipes', q],
    queryFn: () => apiJson<Recipe[]>(`/api/bff/recipes?q=${encodeURIComponent(q)}`),
  });
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => apiJson<User[]>('/api/bff/users'),
  });
  const [portions, setPortions] = useState<Record<string, number>>({});
  const add = useMutation({
    mutationFn: () =>
      apiJson('/api/bff/planner/items', {
        method: 'POST',
        body: JSON.stringify({
          date,
          slot,
          recipeId,
          portions: (users.data ?? []).map((u) => ({
            userId: u.id,
            portions: portions[u.id] ?? 1,
          })),
        }),
      }),
    onSuccess: () => {
      onAdded();
      onClose();
    },
  });

  return (
    <GlassModal title={`Ajouter · ${MEAL_SLOT_LABELS[slot]}`} onClose={onClose}>
      <label className="block text-sm">
        Rechercher une recette
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-stone-200 px-3 py-2"
        />
      </label>
      <ul className="mt-3 max-h-40 space-y-1 overflow-auto">
        {(recipes.data ?? []).map((recipe) => (
          <li key={recipe.id}>
            <button
              className={`w-full rounded-xl px-3 py-2 text-left text-sm ${recipeId === recipe.id ? 'bg-stone-900 text-white' : 'hover:bg-stone-100'}`}
              onClick={() => setRecipeId(recipe.id)}
            >
              {recipe.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {(users.data ?? []).map((u) => (
          <label key={u.id} className="text-sm">
            {u.displayName}
            {u.id === user?.id ? ' (toi)' : ''}
            <input
              type="number"
              min={0.1}
              step={0.1}
              defaultValue={1}
              className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
              onChange={(e) => setPortions((p) => ({ ...p, [u.id]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button className="rounded-full px-4 py-2 text-sm" onClick={onClose}>
          Annuler
        </button>
        <button
          className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={!recipeId || add.isPending}
          onClick={() => add.mutate()}
        >
          Valider
        </button>
      </div>
    </GlassModal>
  );
}
