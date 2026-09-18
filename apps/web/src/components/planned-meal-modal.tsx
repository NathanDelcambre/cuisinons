'use client';

import { Ban, CalendarCheck, Utensils } from 'lucide-react';
import { Button, Modal, cn } from '@cuisinons/ui';
import {
  MEAL_KIND_LABELS,
  MEAL_SLOT_LABELS,
  type MealKind,
  type MealSlot,
} from '@cuisinons/shared';
import { RecipeModal } from './recipe-modal';

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
  const title = MEAL_KIND_LABELS[kind];
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
              ? 'Ce repas est imposé, sans recette à cuisiner.'
              : 'Repas pris à l’extérieur.'}
        </p>
      </div>
    </Modal>
  );
}
