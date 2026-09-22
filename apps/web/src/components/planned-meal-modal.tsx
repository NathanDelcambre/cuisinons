'use client';

import { Ban, CalendarCheck, Utensils } from 'lucide-react';
import { Button, Modal, cn } from '@cuisinons/ui';
import {
  MEAL_KIND_LABELS,
  MEAL_SLOT_LABELS,
  type MealKind,
  type MealSlot,
  UNIT_LABELS,
} from '@cuisinons/shared';
import { RecipeModal } from './recipe-modal';
import { IngredientIcon } from './ingredient-icon';
import { MacroIcon } from './macro-icon';

const KIND_ICON = {
  RESTAURANT: Utensils,
  IMPOSED: CalendarCheck,
  SKIPPED: Ban,
} as const;

export function PlannedMealModal({
  item,
  validated,
  loading,
  onClose,
  onCancelValidation,
  onChangeRecipe,
}: {
  item: {
    date: string;
    slot: MealSlot;
    kind: MealKind;
    recipe: { id: string } | null;
    manualTitle?: string;
    nutrition: {
      perServing: { kcal: number; protein: number; carbs: number; fat: number };
      complete: boolean;
    };
    manualIngredients?: Array<{
      id: string;
      quantity: number;
      unit: keyof typeof UNIT_LABELS;
      ingredient: { nameFr: string; iconUrl?: string | null };
    }>;
  } | null;
  validated: boolean;
  loading?: boolean;
  onClose: () => void;
  onCancelValidation: () => void;
  onChangeRecipe: () => void;
}) {
  const recipeId = item?.kind === 'RECIPE' ? (item.recipe?.id ?? null) : null;
  if (!item) return null;
  if (recipeId) {
    return (
      <RecipeModal
        recipeId={recipeId}
        onClose={onClose}
        plan={{
          validated,
          loading,
          onCancelValidation,
          onChangeRecipe,
        }}
      />
    );
  }

  const kind = item?.kind ?? 'RESTAURANT';
  const Icon = kind === 'RECIPE' ? Utensils : KIND_ICON[kind];
  const title =
    kind === 'IMPOSED' && item.manualTitle ? item.manualTitle : MEAL_KIND_LABELS[kind];
  const when = item
    ? new Date(`${item.date.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  return (
    <Modal
      open={item !== null}
      title={title}
      description={item ? `${MEAL_SLOT_LABELS[item.slot]} · ${when}` : undefined}
      onClose={onClose}
      footerClassName="flex-nowrap gap-1.5 px-3 py-3 sm:gap-2 sm:px-6 sm:py-4"
      footer={
        item ? (
          <>
            {validated ? (
              <Button
                variant="glass"
                size="sm"
                className="shrink-0 sm:h-11 sm:min-h-11 sm:px-5 sm:text-sm"
                loading={loading}
                onClick={onCancelValidation}
              >
                Annuler la validation
              </Button>
            ) : null}
            <Button
              size="sm"
              className="shrink-0 sm:h-11 sm:min-h-11 sm:px-5 sm:text-sm"
              loading={loading}
              onClick={onChangeRecipe}
            >
              Changer de recette
            </Button>
          </>
        ) : null
      }
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-12 items-center justify-center rounded-2xl',
            kind === 'RESTAURANT' && 'bg-peach-200 text-peach-500',
            kind === 'IMPOSED' && 'bg-sage-100 text-sage-600',
            kind === 'SKIPPED' && 'bg-ink-900/6 text-ink-400',
            kind === 'RECIPE' && 'bg-sage-100 text-sage-600',
          )}
        >
          <Icon className="size-5" />
        </span>
        <p className="text-sm text-ink-600">
          {kind === 'SKIPPED'
            ? 'Ce créneau est marqué comme sauté.'
            : kind === 'IMPOSED'
              ? 'Ajout manuel'
              : 'Repas pris à l’extérieur.'}
        </p>
      </div>
      {kind === 'IMPOSED' && item.manualIngredients?.length ? (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/70 pt-4 sm:grid-cols-4">
            <ManualMacro
              kind="kcal"
              label="Calories"
              value={item.nutrition.perServing.kcal}
              unit="kcal"
            />
            <ManualMacro
              kind="protein"
              label="Protéines"
              value={item.nutrition.perServing.protein}
              unit="g"
            />
            <ManualMacro
              kind="carbs"
              label="Glucides"
              value={item.nutrition.perServing.carbs}
              unit="g"
            />
            <ManualMacro
              kind="fat"
              label="Lipides"
              value={item.nutrition.perServing.fat}
              unit="g"
            />
          </dl>
          <ul className="mt-5 space-y-2 border-t border-white/70 pt-4">
            {item.manualIngredients.map((line) => (
              <li
                key={line.id}
                className="flex items-center justify-between gap-3 text-sm text-ink-700"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <IngredientIcon
                    src={line.ingredient.iconUrl ?? null}
                    name={line.ingredient.nameFr}
                    className="size-8 shrink-0"
                  />
                  <span className="truncate">{line.ingredient.nameFr}</span>
                </span>
                <span className="shrink-0 tabular text-ink-500">
                  {line.quantity} {UNIT_LABELS[line.unit]}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Modal>
  );
}

function ManualMacro({
  kind,
  label,
  value,
  unit,
}: {
  kind: 'kcal' | 'protein' | 'carbs' | 'fat';
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-ink-400">
        <MacroIcon kind={kind} className="size-3" />
        {label}
      </dt>
      <dd className="tabular mt-1 font-display text-lg font-semibold text-ink-900">
        {Math.round(value)}
        <span className="ml-0.5 text-xs font-medium text-ink-500">{unit}</span>
      </dd>
    </div>
  );
}
