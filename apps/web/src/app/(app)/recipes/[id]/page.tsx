'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  CalendarPlus,
  ChevronLeft,
  Clock,
  Flame,
  Pencil,
  Star,
  TriangleAlert,
  Utensils,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Inset,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  Stepper,
  buttonClasses,
  cn,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { MEAL_SLOTS, MEAL_SLOT_LABELS, type MealSlot } from '@cuisinons/shared';

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
  equipment: Array<{ equipment: { label: string; slug: string } }>;
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

  if (recipe.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (recipe.isError || !recipe.data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-ink-600">Cette recette est introuvable.</p>
        <Link href="/recipes" className={buttonClasses({ variant: 'glass', size: 'sm' })}>
          <ChevronLeft className="size-3.5" aria-hidden />
          Retour aux recettes
        </Link>
      </div>
    );
  }

  const data = recipe.data;
  const baseServings = Number(data.servings);
  const shown = servings ?? baseServings;
  const factor = shown / baseServings;
  const totalTime = (data.prepTimeMinutes ?? 0) + (data.cookTimeMinutes ?? 0);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors duration-200 ease-out-soft hover:text-ink-900"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Recettes
      </Link>

      <PageHeader
        eyebrow={`par ${data.author.displayName}`}
        title={data.name}
        description={data.description ?? undefined}
        actions={
          <>
            <Link href={`/recipes/${id}/edit`} className={buttonClasses({ variant: 'glass' })}>
              <Pencil className="size-4" aria-hidden />
              Modifier
            </Link>
            <Button icon={CalendarPlus} onClick={() => setPlanner((v) => !v)}>
              Ajouter au planning
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {data.tags.map((t) => (
          <Badge key={t.tag.label} tone="sage">
            {t.tag.label}
          </Badge>
        ))}
        {totalTime > 0 ? (
          <Badge icon={Clock}>
            {totalTime} min
            {data.prepTimeMinutes && data.cookTimeMinutes
              ? ` · ${String(data.prepTimeMinutes)} prép. + ${String(data.cookTimeMinutes)} cuisson`
              : ''}
          </Badge>
        ) : null}
      </div>

      {planner ? <AddToPlan recipeId={data.id} onClose={() => setPlanner(false)} /> : null}

      <Panel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Portions</p>
            <p className="mt-1 text-sm text-ink-500">
              Recette prévue pour {baseServings.toLocaleString('fr-FR')}
            </p>
          </div>
          <Stepper value={shown} onChange={setServings} step={0.5} min={0.5} suffix="portions" />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/70 pt-5 sm:grid-cols-4">
          <Macro label="Calories" value={data.nutrition.perServing.kcal * factor} unit="kcal" accent />
          <Macro label="Protéines" value={data.nutrition.perServing.protein * factor} unit="g" />
          <Macro label="Glucides" value={data.nutrition.perServing.carbs * factor} unit="g" />
          <Macro label="Lipides" value={data.nutrition.perServing.fat * factor} unit="g" />
        </dl>

        {!data.nutrition.complete ? (
          <p className="mt-4 flex items-start gap-2 text-sm text-peach-500">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Certaines valeurs sont estimées ou incomplètes ({data.nutrition.incompleteLines} ligne
            {data.nutrition.incompleteLines > 1 ? 's' : ''}).
          </p>
        ) : null}
      </Panel>

      <Card>
        <h2 className="mb-4 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">Ingrédients</h2>
        <ul className="space-y-2">
          {data.ingredients.map((line, index) => (
            <li
              key={index}
              className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/70 px-3 py-2.5"
            >
              {line.ingredient.iconUrl ? (
                <img src={line.ingredient.iconUrl} alt="" width={32} height={32} className="size-8 shrink-0" />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-sage-600">
                  <Utensils className="size-4" aria-hidden />
                </span>
              )}
              <span className="min-w-0 flex-1 text-sm text-ink-900">
                <span className="tabular font-medium">
                  {(Number(line.quantity) * factor).toLocaleString('fr-FR')} {line.unit.toLowerCase()}
                </span>{' '}
                {line.ingredient.nameFr}
              </span>
              {line.estimated ? <Badge tone="peach">estimation</Badge> : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">Ustensiles</h2>
        {data.equipment.length === 0 ? (
          <p className="text-sm text-ink-600">Aucun ustensile particulier.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {data.equipment.map((e) => (
              <li
                key={e.equipment.slug}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[13px] font-medium text-ink-600"
              >
                <img
                  src={`/equipment/${e.equipment.slug}.png`}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5"
                  decoding="async"
                />
                {e.equipment.label}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">Préparation</h2>
        <ol className="space-y-3">
          {data.steps.map((step) => (
            <li key={step.stepNumber} className="flex gap-3">
              <span
                aria-hidden
                className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700"
              >
                {step.stepNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-ink-800">{step.description}</p>
                {step.durationMinutes ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                    <Clock className="size-3" aria-hidden />
                    {step.durationMinutes} min
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">Notes</h2>
        <p className="mb-3 text-sm text-ink-500">
          {data.rating.count === 0
            ? 'Personne n’a encore noté cette recette.'
            : `Moyenne de ${data.rating.average?.toFixed(1) ?? '—'} sur ${String(data.rating.count)} note${data.rating.count > 1 ? 's' : ''}.`}
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= Math.round(data.rating.average ?? 0);
            return (
              <button
                key={star}
                type="button"
                aria-label={`Noter ${String(star)} sur 5`}
                onClick={() => rate.mutate(star)}
                className="rounded-full p-1 transition duration-200 ease-out-soft hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
              >
                <Star
                  className={cn('size-6', filled ? 'fill-peach-400 text-peach-400' : 'text-ink-300')}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
        {data.rating.ratings.length > 0 ? (
          <ul className="mt-4 space-y-1 text-sm text-ink-500">
            {data.rating.ratings.map((r) => (
              <li key={r.user.displayName}>
                {r.user.displayName} : {r.stars}/5
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </article>
  );
}

function Macro({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
        {accent ? <Flame className="size-3.5 text-peach-500" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="tabular mt-1 font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
        {Math.round(value)}
        <span className="ml-0.5 text-sm font-medium text-ink-500">{unit}</span>
      </dd>
    </div>
  );
}

function AddToPlan({ recipeId, onClose }: { recipeId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState<MealSlot>('DINNER');
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => apiJson<Array<{ id: string }>>('/api/bff/users'),
  });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['planner'] });
      onClose();
    },
  });

  return (
    <Inset className="p-5">
      <h3 className="text-sm font-medium text-ink-900">Ajouter au planning</h3>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={date}
          aria-label="Date"
          onChange={(e) => setDate(e.target.value)}
          className="h-11 rounded-xl border border-white/80 bg-white/75 px-4 text-sm text-ink-900 shadow-soft"
        />
        <Select value={slot} aria-label="Créneau" className="w-auto" onChange={(e) => setSlot(e.target.value as MealSlot)}>
          {MEAL_SLOTS.map((s) => (
            <option key={s} value={s}>
              {MEAL_SLOT_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button
          disabled={!users.data?.length}
          loading={add.isPending}
          onClick={() => add.mutate()}
        >
          Valider
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </Inset>
  );
}
