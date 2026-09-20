'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Modal, Stepper } from '@cuisinons/ui';
import { type MealSlot, type QuantityUnit, UNIT_LABELS } from '@cuisinons/shared';
import { apiJson } from '@/lib/api';
import { IngredientPicker } from './ingredient-picker';
import { IngredientIcon } from './ingredient-icon';
import { useAuth } from './auth-provider';

type Picked = { id: string; nameFr: string; iconUrl: string | null };
type Line = { ingredient: Picked; quantity: number; unit: QuantityUnit };
type User = { id: string; displayName: string };

export function ManualMealDialog({
  open,
  date,
  slot,
  onClose,
  onAdded,
}: {
  open: boolean;
  date: string;
  slot: MealSlot;
  onClose: () => void;
  onAdded: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [lines, setLines] = useState<Line[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [portions, setPortions] = useState<Record<string, number>>({});
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => apiJson<User[]>('/api/bff/users'),
    enabled: open,
  });
  useEffect(() => {
    if (open) {
      setLines([]);
      setPortions({});
      setPickerOpen(false);
    }
  }, [open, date, slot]);
  const add = useMutation({
    mutationFn: () =>
      apiJson('/api/bff/planner/items', {
        method: 'POST',
        body: JSON.stringify({
          date,
          slot,
          kind: 'IMPOSED',
          ingredients: lines.map((line) => ({
            ingredientId: line.ingredient.id,
            quantity: line.quantity,
            unit: line.unit,
          })),
          portions: (users.data ?? []).map((u) => ({
            userId: u.id,
            portions: portions[u.id] ?? 1,
          })),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['planner'] });
      onAdded();
      onClose();
    },
  });
  const canSubmit = lines.length > 0 && (users.data ?? []).some((u) => (portions[u.id] ?? 1) > 0);
  return (
    <>
      <Modal
        open={open && !pickerOpen}
        title="Ajouter manuellement"
        description="Ajoute les ingrédients et les quantités de ce repas."
        onClose={onClose}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              icon={Check}
              disabled={!canSubmit}
              loading={add.isPending}
              onClick={() => add.mutate()}
            >
              Ajouter au planning
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div
              key={`${line.ingredient.id}-${index}`}
              className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2"
            >
              <IngredientIcon
                src={line.ingredient.iconUrl}
                name={line.ingredient.nameFr}
                className="size-8 shrink-0"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-800">
                {line.ingredient.nameFr}
              </span>
              <span className="shrink-0 text-sm tabular text-ink-600">
                {line.quantity} {UNIT_LABELS[line.unit]}
              </span>
              <IconButton
                icon={Trash2}
                label={`Supprimer ${line.ingredient.nameFr}`}
                size="sm"
                variant="ghost"
                className="text-ink-400 hover:text-tomato-500"
                onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
              />
            </div>
          ))}
          <Button variant="glass" icon={Plus} onClick={() => setPickerOpen(true)}>
            Ajouter un ingrédient
          </Button>
        </div>
        <div className="mt-5 space-y-3 border-t border-white/70 pt-4">
          <p className="text-sm font-medium text-ink-700">Portions</p>
          {(users.data ?? []).map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3">
              <span className="truncate text-sm text-ink-600">
                {u.displayName}
                {u.id === user?.id ? ' (toi)' : ''}
              </span>
              <Stepper
                value={portions[u.id] ?? 1}
                onChange={(next) => setPortions((current) => ({ ...current, [u.id]: next }))}
                step={0.5}
                min={0}
                max={6}
                suffix="portion"
                labelDecrease="Diminuer les portions"
                labelIncrease="Augmenter les portions"
              />
            </div>
          ))}
        </div>
        {add.error instanceof Error ? (
          <p className="mt-3 text-sm text-tomato-500">{add.error.message}</p>
        ) : null}
      </Modal>
      <IngredientPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        quantity={{
          onBack: () => setPickerOpen(false),
          onConfirm: (ingredient, input) => {
            setLines((current) => [
              ...current,
              { ingredient, quantity: input.quantity, unit: input.unit },
            ]);
            setPickerOpen(false);
          },
        }}
      />
    </>
  );
}
