'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Clock, Flame, Leaf, Refrigerator, Sparkles } from 'lucide-react';
import {
  DIET_LABELS,
  DIETS,
  DISH_KIND_LABELS,
  DISH_KINDS,
  UNIT_LABELS,
  kitchenLabel,
  type Diet,
  type DishKind,
} from '@cuisinons/shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Stepper,
  buttonClasses,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { routes } from '@/lib/routes';
import { IngredientIcon } from './ingredient-icon';

type RecipeDraft = {
  name: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  status: 'PUBLISHED';
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
    unit: 'G';
    displayQuantity: string;
  }>;
  steps: Array<{ description: string; durationMinutes: number | null }>;
  tagIds: string[];
  equipmentIds: string[];
};

type SuggestedDish = {
  key: string;
  kind: DishKind;
  name: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  healthScore: number;
  healthNotes: string[];
  ingredients: Array<{
    ingredientId: string;
    nameFr: string;
    iconUrl: string | null;
    quantity: number;
    unit: 'G';
    displayQuantity: string;
  }>;
  steps: Array<{ description: string; durationMinutes: number | null }>;
  nutrition: { perServing: { kcal: number; protein: number; carbs: number; fat: number } };
  recipeDraft: RecipeDraft;
};

type Preview = {
  pantry: {
    count: number;
    usableCount: number;
    names: string[];
  };
  dishes: SuggestedDish[];
  shortage: {
    title: string;
    explanation: string;
    missing: string[];
    alternative: {
      label: string;
      explanation: string;
      dish: SuggestedDish;
    } | null;
  } | null;
};

const KIND_OPTIONS = [
  { value: '', label: 'Tous les types' },
  ...DISH_KINDS.map((value) => ({ value, label: DISH_KIND_LABELS[value] })),
];

const TIME_OPTIONS = [
  { value: '', label: 'Temps indifférent' },
  { value: '15', label: '≤ 15 min' },
  { value: '20', label: '≤ 20 min' },
  { value: '30', label: '≤ 30 min' },
  { value: '45', label: '≤ 45 min' },
];

const COUNT_OPTIONS = [
  { value: '', label: 'Nombre indifférent' },
  { value: '3', label: '3 ingrédients max' },
  { value: '4', label: '4 ingrédients max' },
  { value: '5', label: '5 ingrédients max' },
  { value: '6', label: '6 ingrédients max' },
  { value: '8', label: '8 ingrédients max' },
];

function InventoryBanner({
  count,
  names,
  status,
}: {
  count: number;
  names: string[];
  status: 'pending' | 'empty' | 'stocked';
}) {
  const sample = names.slice(0, 4).join(', ');
  const title =
    status === 'empty'
      ? 'Aucun aliment en réserve'
      : status === 'stocked'
        ? `${String(count)} aliment${count > 1 ? 's' : ''} dans tes réserves`
        : 'Basé sur tes réserves';
  const detail =
    status === 'empty'
      ? 'On n’invente rien : un plat n’est proposé que s’il tient avec ton inventaire.'
      : status === 'stocked'
        ? `Uniquement ${sample || 'ce que tu as en stock'}${names.length > 4 ? '…' : ''}. Rien n’est ajouté hors stock.`
        : 'On compose un plat uniquement avec ce que tu as déjà en stock. Rien n’est inventé.';
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-sage-200/80 bg-sage-50/90 px-3.5 py-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
        <Refrigerator className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900">{title}</p>
        <p className="mt-0.5 text-sm text-ink-500">{detail}</p>
      </div>
    </div>
  );
}

function emptySuggestion({
  pantryEmpty,
  shortage,
  requestFailed,
  noDish,
  waiting,
}: {
  pantryEmpty: boolean;
  shortage: Preview['shortage'];
  requestFailed: boolean;
  noDish: boolean;
  waiting: boolean;
}): { show: boolean; title: string; description: string } {
  if (pantryEmpty) {
    return {
      show: true,
      title: 'Tes réserves sont vides',
      description:
        'On compose un plat uniquement avec ce que tu as déjà. Ajoute d’abord tes ingrédients, puis reviens ici.',
    };
  }
  if (waiting) {
    return { show: false, title: '', description: '' };
  }
  if (noDish && shortage) {
    return { show: true, title: shortage.title, description: shortage.explanation };
  }
  if (requestFailed) {
    return {
      show: true,
      title: 'Aucun plat avec tes réserves',
      description:
        'Les propositions s’appuient uniquement sur ton inventaire. Complète tes réserves, ou réessaie.',
    };
  }
  if (noDish) {
    return {
      show: true,
      title: 'Aucun plat avec tes réserves',
      description: 'Avec ce que tu as en stock et ces filtres, on ne peut pas assembler un plat.',
    };
  }
  return { show: false, title: '', description: '' };
}

export function SuggestDishModal({
  open,
  onClose,
  onAccepted,
}: {
  open: boolean;
  onClose: () => void;
  onAccepted: (recipeId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [diet, setDiet] = useState<Diet>('omnivore');
  const [kind, setKind] = useState('');
  const [servings, setServings] = useState(2);
  const [maxMinutes, setMaxMinutes] = useState('');
  const [maxIngredients, setMaxIngredients] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const body = useMemo(
    () => ({
      servings,
      diet,
      kind: (kind || null) as DishKind | null,
      maxMinutes: maxMinutes ? Number(maxMinutes) : null,
      maxIngredients: maxIngredients ? Number(maxIngredients) : null,
    }),
    [servings, diet, kind, maxMinutes, maxIngredients],
  );

  const pantry = useQuery({
    queryKey: ['pantry'],
    queryFn: () => apiJson<Array<{ id: string }>>('/api/bff/pantry'),
    enabled: open,
    staleTime: 30_000,
  });

  const preview = useQuery({
    queryKey: ['suggestions', body],
    queryFn: () =>
      apiJson<Preview>('/api/bff/suggestions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    enabled: open,
    retry: 1,
  });

  const dishes = preview.data?.dishes ?? [];
  const shortage = preview.data?.shortage ?? null;
  const pantryCount = preview.data?.pantry.count ?? pantry.data?.length ?? 0;
  const usableCount = preview.data?.pantry.usableCount ?? pantryCount;
  const pantryNames = preview.data?.pantry.names ?? [];
  const pantryEmpty = pantry.isSuccess && pantry.data.length === 0;
  const knownEmpty = pantryEmpty || (preview.isSuccess && usableCount === 0);
  const bannerStatus: 'pending' | 'empty' | 'stocked' = knownEmpty
    ? 'empty'
    : pantryCount > 0
      ? 'stocked'
      : 'pending';
  const selected =
    dishes.find((dish) => dish.key === selectedKey) ??
    dishes[0] ??
    shortage?.alternative?.dish ??
    null;
  const waiting = preview.isLoading || (preview.isPending && !preview.data);
  const noDish = dishes.length === 0 && !shortage?.alternative;
  const empty = emptySuggestion({
    pantryEmpty: knownEmpty,
    shortage,
    requestFailed: preview.isError,
    noDish,
    waiting,
  });

  const accept = useMutation({
    mutationFn: (draft: RecipeDraft) =>
      apiJson<{ id: string }>('/api/bff/recipes', {
        method: 'POST',
        body: JSON.stringify(draft),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onAccepted(created.id);
    },
  });

  return (
    <Modal
      open={open}
      title="Proposer un plat"
      description="Rien n’est enregistré tant que tu n’as pas validé."
      size="2xl"
      onClose={onClose}
      footer={
        <>
          <Link href={routes.recetteNouvelle} className={buttonClasses({ variant: 'glass' })}>
            Créer à la main
          </Link>
          {selected ? (
            <Button
              icon={Sparkles}
              loading={accept.isPending}
              onClick={() => accept.mutate(selected.recipeDraft)}
            >
              Ajouter à mes recettes
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <InventoryBanner count={pantryCount} names={pantryNames} status={bannerStatus} />

        <div className="space-y-3">
          <Segmented
            label="Régime"
            options={DIETS.map((value) => ({ value, label: DIET_LABELS[value] }))}
            value={diet}
            onChange={setDiet}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type de plat">
              {({ id }) => <Select id={id} value={kind} options={KIND_OPTIONS} onChange={setKind} />}
            </Field>
            <Field label="Temps total">
              {({ id }) => (
                <Select id={id} value={maxMinutes} options={TIME_OPTIONS} onChange={setMaxMinutes} />
              )}
            </Field>
            <Field label="Ingrédients">
              {({ id }) => (
                <Select
                  id={id}
                  value={maxIngredients}
                  options={COUNT_OPTIONS}
                  onChange={setMaxIngredients}
                />
              )}
            </Field>
            <Field label="Portions">
              {() => (
                <Stepper
                  value={servings}
                  onChange={setServings}
                  step={1}
                  min={1}
                  max={8}
                  suffix="pers."
                  labelDecrease="Moins de portions"
                  labelIncrease="Plus de portions"
                />
              )}
            </Field>
          </div>
        </div>

        {!open ? null : waiting && !empty.show ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
            <Skeleton className="h-40" />
            <Skeleton className="h-72" />
          </div>
        ) : empty.show ? (
          <EmptyState
            icon={Refrigerator}
            title={empty.title}
            description={empty.description}
            className="py-8"
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                {preview.isError && !knownEmpty ? (
                  <Button variant="glass" size="sm" onClick={() => void preview.refetch()}>
                    Réessayer
                  </Button>
                ) : null}
                <Link href={routes.reserves} className={buttonClasses({ size: 'sm' })}>
                  Ouvrir les réserves
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
            <div className="space-y-2">
              {dishes.map((dish) => (
                <button
                  key={dish.key}
                  type="button"
                  onClick={() => setSelectedKey(dish.key)}
                  className="block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
                >
                  <Card
                    className={
                      selected?.key === dish.key ? 'border-sage-400 bg-white/90 p-3.5' : 'p-3.5'
                    }
                  >
                    <p className="font-display text-sm font-semibold tracking-[-0.02em] text-ink-900">
                      {dish.name}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {DISH_KIND_LABELS[dish.kind]} · {dish.prepTimeMinutes + dish.cookTimeMinutes} min
                    </p>
                  </Card>
                </button>
              ))}
              {shortage?.alternative ? (
                <div className="pt-2">
                  <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-ink-400">
                    {shortage.alternative.label}
                  </p>
                  <p className="mb-2 px-1 text-sm text-ink-500">{shortage.explanation}</p>
                  <p className="mb-2 px-1 text-sm text-ink-500">{shortage.alternative.explanation}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(shortage.alternative!.dish.key)}
                    className="block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
                  >
                    <Card
                      className={
                        selected?.key === shortage.alternative.dish.key
                          ? 'border-peach-400 bg-white/90 p-3.5'
                          : 'p-3.5'
                      }
                    >
                      <p className="font-display text-sm font-semibold tracking-[-0.02em] text-ink-900">
                        {shortage.alternative.dish.name}
                      </p>
                      <p className="mt-1 text-xs text-ink-500">Piste alternative — à valider aussi</p>
                    </Card>
                  </button>
                </div>
              ) : null}
            </div>

            {selected ? (
              <DishDetail
                dish={selected}
                error={accept.error instanceof Error ? accept.error.message : null}
              />
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}

function DishDetail({ dish, error }: { dish: SuggestedDish; error: string | null }) {
  const total = dish.prepTimeMinutes + dish.cookTimeMinutes;
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-ink-500">{DISH_KIND_LABELS[dish.kind]}</p>
        <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-ink-900">
          {dish.name}
        </h3>
        <p className="mt-2 max-w-prose text-sm text-ink-500">{dish.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge icon={Clock}>
          {total} min · {dish.servings} pers.
        </Badge>
        <Badge icon={Flame} tone="peach">
          {Math.round(dish.nutrition.perServing.kcal)} kcal
        </Badge>
        <Badge>
          {Math.round(dish.nutrition.perServing.protein)} g prot. ·{' '}
          {Math.round(dish.nutrition.perServing.carbs)} g gluc. ·{' '}
          {Math.round(dish.nutrition.perServing.fat)} g lip.
        </Badge>
        <Badge icon={Leaf} tone="sage">
          {dish.healthScore}/100
        </Badge>
      </div>

      {dish.healthNotes.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {dish.healthNotes.map((note) => (
            <li key={note}>
              <Badge tone="sage">{note}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <h4 className="mb-2 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
          Ingrédients
        </h4>
        <ul className="space-y-1.5">
          {dish.ingredients.map((line) => (
            <li key={line.ingredientId} className="flex items-center gap-3 text-sm text-ink-800">
              <IngredientIcon src={line.iconUrl} name={line.nameFr} />
              <span className="min-w-0 flex-1 truncate">{kitchenLabel(line.nameFr)}</span>
              <span className="tabular shrink-0 text-ink-500">
                {line.displayQuantity} {UNIT_LABELS[line.unit]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
          Préparation
        </h4>
        <ol className="space-y-2">
          {dish.steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm text-ink-800">
              <span
                aria-hidden
                className="tabular mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700"
              >
                {index + 1}
              </span>
              <span>
                {step.description}
                {step.durationMinutes ? (
                  <span className="text-ink-400"> · {step.durationMinutes} min</span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-tomato-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
