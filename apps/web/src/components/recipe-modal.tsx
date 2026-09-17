'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  CalendarPlus,
  Clock,
  Flame,
  Pencil,
  Star,
  TriangleAlert,
  Utensils,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  IconButton,
  Modal,
  Select,
  Skeleton,
  Stepper,
  buttonClasses,
  cn,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { routes } from '@/lib/routes';
import {
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  UNIT_LABELS,
  formatQuantity,
  type MealSlot,
  type QuantityUnit,
} from '@cuisinons/shared';

export type RecipeDetail = {
  id: string;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
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
  };
  rating: {
    average: number | null;
    count: number;
    ratings: Array<{ stars: number; user: { displayName: string } }>;
  };
};

function unitLabel(unit: string) {
  return UNIT_LABELS[unit as QuantityUnit] ?? unit.toLowerCase();
}

export function RecipeModal({
  recipeId,
  onClose,
  plan,
}: {
  recipeId: string | null;
  onClose: () => void;
  plan?: {
    validated: boolean;
    onCancelValidation: () => void;
    onChangeRecipe: () => void;
    loading?: boolean;
  };
}) {
  const open = recipeId !== null;
  const [servings, setServings] = useState<number | null>(null);
  const [planning, setPlanning] = useState(false);
  const recipe = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: () => apiJson<RecipeDetail>(`/api/bff/recipes/${recipeId}`),
    enabled: open,
  });

  useEffect(() => {
    setServings(null);
    setPlanning(false);
  }, [recipeId]);

  const data = recipe.data;
  const title = data?.name ?? 'Recette';

  return (
    <Modal
      open={open}
      title={title}
      chrome="bare"
      size="xl"
      onClose={() => {
        setPlanning(false);
        setServings(null);
        onClose();
      }}
      footer={
        data ? (
          planning ? (
            <AddToPlan
              recipeId={data.id}
              onCancel={() => setPlanning(false)}
              onAdded={() => setPlanning(false)}
            />
          ) : (
            <>
              <Link href={routes.recetteModifier(data.id)} className={buttonClasses({ variant: 'glass' })}>
                <Pencil className="size-4" aria-hidden />
                Modifier
              </Link>
              {plan ? (
                plan.validated ? (
                  <Button variant="glass" loading={plan.loading} onClick={plan.onCancelValidation}>
                    Annuler la validation
                  </Button>
                ) : (
                  <Button loading={plan.loading} onClick={plan.onChangeRecipe}>
                    Changer de recette
                  </Button>
                )
              ) : (
                <Button icon={CalendarPlus} onClick={() => setPlanning(true)}>
                  Ajouter au planning
                </Button>
              )}
            </>
          )
        ) : null
      }
    >
      {!open ? null : recipe.isLoading ? (
        <RecipeModalSkeleton />
      ) : recipe.isError || !data ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-ink-600">Cette recette est introuvable.</p>
        </div>
      ) : (
        <RecipeModalBody
          data={data}
          servings={servings}
          onServings={setServings}
          onClose={() => {
            setPlanning(false);
            setServings(null);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function RecipeModalBody({
  data,
  servings,
  onServings,
  onClose,
}: {
  data: RecipeDetail;
  servings: number | null;
  onServings: (next: number) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const rate = useMutation({
    mutationFn: (stars: number) =>
      apiJson(`/api/bff/recipes/${data.id}/rating`, { method: 'PUT', body: JSON.stringify({ stars }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['recipe', data.id] });
      void queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const baseServings = Number(data.servings);
  const shown = servings ?? baseServings;
  const factor = shown / baseServings;
  const totalTime = (data.prepTimeMinutes ?? 0) + (data.cookTimeMinutes ?? 0);

  return (
    <>
      <div className="relative">
        {data.photoUrl ? (
          <>
            <img
              src={data.photoUrl}
              alt=""
              className="aspect-[16/9] w-full object-cover sm:aspect-[2/1]"
              decoding="async"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[rgba(255,252,247,0.97)] to-transparent" />
          </>
        ) : (
          <div className="h-4 sm:h-5" />
        )}
        <IconButton
          icon={X}
          label="Fermer"
          size="sm"
          variant="glass"
          className="absolute right-3 top-3 bg-white/90 shadow-soft"
          onClick={onClose}
        />
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        <header className="pr-12">
          <p className="text-sm text-ink-500">par {data.author.displayName}</p>
          <h2 className="mt-1 font-display text-[1.65rem] font-semibold leading-tight tracking-[-0.03em] text-ink-900">
            {data.name}
          </h2>
          {data.description ? (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-600">{data.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {totalTime > 0 ? (
              <Badge icon={Clock}>
                {totalTime} min
                {data.prepTimeMinutes && data.cookTimeMinutes
                  ? ` · ${String(data.prepTimeMinutes)} prép. + ${String(data.cookTimeMinutes)} cuisson`
                  : ''}
              </Badge>
            ) : null}
            {data.rating.count > 0 ? (
              <Badge tone="peach" icon={Star}>
                {data.rating.average?.toFixed(1)} ({data.rating.count})
              </Badge>
            ) : null}
            {data.tags.map((t) => (
              <Badge key={t.tag.label} tone="sage">
                {t.tag.label}
              </Badge>
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Portions</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Prévue pour {baseServings.toLocaleString('fr-FR')}
              </p>
            </div>
            <Stepper value={shown} onChange={onServings} step={0.5} min={0.5} suffix="portions" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/70 pt-4 sm:grid-cols-4">
            <Macro label="Calories" value={data.nutrition.perServing.kcal * factor} unit="kcal" accent />
            <Macro label="Protéines" value={data.nutrition.perServing.protein * factor} unit="g" />
            <Macro label="Glucides" value={data.nutrition.perServing.carbs * factor} unit="g" />
            <Macro label="Lipides" value={data.nutrition.perServing.fat * factor} unit="g" />
          </dl>
          {!data.nutrition.complete && data.nutrition.incompleteLines > 0 ? (
            <p className="mt-3 flex items-start gap-2 text-xs text-peach-500">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Certaines valeurs sont estimées ({data.nutrition.incompleteLines} ligne
              {data.nutrition.incompleteLines > 1 ? 's' : ''}).
            </p>
          ) : null}
        </section>

        <section>
          <h3 className="mb-3 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
            Ingrédients
          </h3>
          {data.ingredients.length === 0 ? (
            <p className="text-sm text-ink-500">Aucun ingrédient.</p>
          ) : (
            <ul className="divide-y divide-white/80 overflow-hidden rounded-2xl border border-white/70 bg-white/60">
              {data.ingredients.map((line, index) => (
                <li key={index} className="flex items-center gap-3 px-3 py-2.5">
                  {line.ingredient.iconUrl ? (
                    <img
                      src={line.ingredient.iconUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 shrink-0"
                    />
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-sage-600">
                      <Utensils className="size-4" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 text-sm text-ink-900">
                    <span className="tabular font-medium">
                      {formatQuantity(Number(line.quantity) * factor)} {unitLabel(line.unit)}
                    </span>{' '}
                    <span className="text-ink-700">{line.ingredient.nameFr}</span>
                  </span>
                  {line.estimated ? <Badge tone="peach">estim.</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {data.equipment.length > 0 ? (
          <section>
            <h3 className="mb-3 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
              Ustensiles
            </h3>
            <ul className="flex flex-wrap gap-2">
              {data.equipment.map((e) => (
                <li
                  key={e.equipment.slug}
                  className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[13px] font-medium text-ink-600 shadow-soft"
                >
                  <img
                    src={`/equipment/${e.equipment.slug}.png`}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6"
                    decoding="async"
                  />
                  {e.equipment.label}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="mb-3 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
            Préparation
          </h3>
          {data.steps.length === 0 ? (
            <p className="text-sm text-ink-500">Aucune étape rédigée.</p>
          ) : (
            <ol className="space-y-3">
              {data.steps.map((step) => (
                <li key={step.stepNumber} className="flex gap-3">
                  <span
                    aria-hidden
                    className="tabular mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700"
                  >
                    {step.stepNumber}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
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
          )}
        </section>

        <section>
          <h3 className="mb-1 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
            Notes
          </h3>
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
        </section>
      </div>
    </>
  );
}

function RecipeModalSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[16/9] w-full rounded-none sm:aspect-[2/1]" />
      <div className="space-y-4 px-6 py-5">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-28" />
        <Skeleton className="h-40" />
      </div>
    </div>
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
      <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">
        {accent ? <Flame className="size-3 text-peach-500" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="tabular mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-ink-900">
        {Math.round(value)}
        <span className="ml-0.5 text-xs font-medium text-ink-500">{unit}</span>
      </dd>
    </div>
  );
}

function AddToPlan({
  recipeId,
  onCancel,
  onAdded,
}: {
  recipeId: string;
  onCancel: () => void;
  onAdded: () => void;
}) {
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
      onAdded();
    },
  });

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
      <p className="mr-auto hidden text-sm font-medium text-ink-700 sm:block">Au planning</p>
      <input
        type="date"
        value={date}
        aria-label="Date"
        onChange={(e) => setDate(e.target.value)}
        className="h-11 rounded-xl border border-white/80 bg-white/75 px-4 text-sm text-ink-900 shadow-soft"
      />
      <Select
        value={slot}
        aria-label="Créneau"
        className="w-auto min-w-36 shrink-0"
        options={MEAL_SLOTS.map((s) => ({ value: s, label: MEAL_SLOT_LABELS[s] }))}
        onChange={setSlot}
      />
      <Button variant="ghost" onClick={onCancel}>
        Annuler
      </Button>
      <Button disabled={!users.data?.length} loading={add.isPending} onClick={() => add.mutate()}>
        Valider
      </Button>
    </div>
  );
}
