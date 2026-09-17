'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiJson } from '@/lib/api';
import { AddMealDialog } from '@/components/add-meal-dialog';
import { MEAL_SLOTS, type MealSlot } from '@cuisinons/shared';

type Recipe = {
  id: string;
  name: string;
  description?: string | null;
  servings: string;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  author: { displayName: string };
  ingredients: Array<{
    quantity: string;
    unit: string;
    grams: string | null;
    estimated: boolean;
    ingredient: { nameFr: string; iconUrl: string | null };
  }>;
  steps: Array<{ stepNumber: number; description: string; durationMinutes: number | null }>;
  tags: Array<{ tag: { label: string } }>;
  equipment: Array<{ equipment: { label: string } }>;
  nutrition: {
    complete: boolean;
    incompleteLines: number;
    perServing: { kcal: number; protein: number; carbs: number; fat: number };
    total: { kcal: number; protein: number; carbs: number; fat: number };
    per100g: { kcal: number; protein: number; carbs: number; fat: number } | null;
  };
  rating: { average: number | null; count: number; ratings: Array<{ stars: number; user: { displayName: string } }> };
};

export default function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [servings, setServings] = useState<number | null>(null);
  const [planner, setPlanner] = useState(false);
  const recipe = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => apiJson<Recipe>(`/api/bff/recipes/${id}`),
  });
  const rate = useMutation({
    mutationFn: (stars: number) =>
      apiJson(`/api/bff/recipes/${id}/rating`, { method: 'PUT', body: JSON.stringify({ stars }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipe', id] }),
  });

  if (recipe.isLoading) return <p>Chargement…</p>;
  if (recipe.isError || !recipe.data) return <p>Recette introuvable.</p>;
  const data = recipe.data;
  const baseServings = Number(data.servings);
  const shown = servings ?? baseServings;
  const factor = shown / baseServings;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{data.name}</h1>
          <p className="mt-1 text-sm text-stone-500">par {data.author.displayName}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/recipes/${id}/edit`} className="glass rounded-full px-4 py-2 text-sm">
            Modifier
          </Link>
          <button className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white" onClick={() => setPlanner(true)}>
            Ajouter au planning
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.tags.map((t) => (
          <span key={t.tag.label} className="glass rounded-full px-3 py-1 text-xs">
            {t.tag.label}
          </span>
        ))}
      </div>
      <div className="glass flex items-center gap-4 rounded-[28px] p-4">
        <button aria-label="Moins" className="rounded-full px-3 py-1 text-lg" onClick={() => setServings(Math.max(0.5, shown - 0.5))}>
          −
        </button>
        <span>{shown} portions</span>
        <button aria-label="Plus" className="rounded-full px-3 py-1 text-lg" onClick={() => setServings(shown + 0.5)}>
          +
        </button>
      </div>
      <section className="glass grid grid-cols-2 gap-3 rounded-[28px] p-5 sm:grid-cols-4">
        <Macro label="kcal" value={data.nutrition.perServing.kcal * factor} />
        <Macro label="protéines" value={data.nutrition.perServing.protein * factor} unit="g" />
        <Macro label="glucides" value={data.nutrition.perServing.carbs * factor} unit="g" />
        <Macro label="lipides" value={data.nutrition.perServing.fat * factor} unit="g" />
      </section>
      {!data.nutrition.complete ? (
        <p className="text-sm text-stone-500">Certaines valeurs sont estimées ou incomplètes ({data.nutrition.incompleteLines} ligne(s)).</p>
      ) : null}
      <section>
        <h2 className="mb-3 text-lg font-medium">Ingrédients</h2>
        <ul className="space-y-2">
          {data.ingredients.map((line, index) => (
            <li key={index} className="glass flex items-center gap-3 rounded-2xl px-3 py-2">
              {line.ingredient.iconUrl ? (
                <img src={line.ingredient.iconUrl} alt="" width={36} height={36} className="size-9" />
              ) : null}
              <span>
                {(Number(line.quantity) * factor).toLocaleString('fr-FR')} {line.unit.toLowerCase()} {line.ingredient.nameFr}
                {line.estimated ? <span className="ml-2 text-xs text-stone-400">estimation</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium">Ustensiles</h2>
        <p className="text-sm text-stone-600">{data.equipment.map((e) => e.equipment.label).join(' · ') || 'Aucun'}</p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium">Préparation</h2>
        <ol className="space-y-3">
          {data.steps.map((step) => (
            <li key={step.stepNumber} className="glass rounded-2xl p-4">
              <span className="text-xs text-stone-400">Étape {step.stepNumber}</span>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-medium">Notes</h2>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} aria-label={`${star} étoiles`} onClick={() => rate.mutate(star)}>
              {star <= Math.round(data.rating.average ?? 0) ? '★' : '☆'}
            </button>
          ))}
        </div>
        <ul className="mt-2 text-sm text-stone-500">
          {data.rating.ratings.map((r) => (
            <li key={r.user.displayName}>
              {r.user.displayName} : {r.stars}/5
            </li>
          ))}
        </ul>
      </section>
      {planner ? (
        <AddToPlan recipeId={data.id} onClose={() => setPlanner(false)} />
      ) : null}
    </article>
  );
}

function Macro({ label, value, unit = '' }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-lg font-medium">
        {Math.round(value)}
        {unit}
      </p>
    </div>
  );
}

function AddToPlan({ recipeId, onClose }: { recipeId: string; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState<MealSlot>('DINNER');
  const users = useQuery({ queryKey: ['users'], queryFn: () => apiJson<Array<{ id: string }>>('/api/bff/users') });
  const add = useMutation({
    mutationFn: () =>
      apiJson('/api/bff/planner/items', {
        method: 'POST',
        body: JSON.stringify({
          date,
          slot,
          recipeId,
          portions: (users.data ?? []).map((u) => ({ userId: u.id, portions: 1 })),
        }),
      }),
    onSuccess: onClose,
  });
  return (
    <div className="glass rounded-[28px] p-5">
      <h3 className="font-medium">Ajouter au planning</h3>
      <div className="mt-3 flex flex-wrap gap-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border px-3 py-2" />
        <select value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)} className="rounded-xl border px-3 py-2">
          {MEAL_SLOTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white" onClick={() => add.mutate()}>
          Valider
        </button>
        <button onClick={onClose}>Annuler</button>
      </div>
    </div>
  );
}
