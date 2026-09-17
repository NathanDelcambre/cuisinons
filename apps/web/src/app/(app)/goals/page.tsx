'use client';

import { GOAL_MODES, GOAL_MODE_LABELS, type GoalMode } from '@cuisinons/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Croissant, Droplet, Flame, Beef, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, Field, Input, PageHeader, Select, Skeleton } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';

type Goals = {
  caloriesMode: GoalMode;
  caloriesValue: string | null;
  caloriesTolerance: string | null;
  proteinMode: GoalMode;
  proteinValue: string | null;
  proteinTolerance: string | null;
  carbsMode: GoalMode;
  carbsValue: string | null;
  carbsTolerance: string | null;
  fatMode: GoalMode;
  fatValue: string | null;
  fatTolerance: string | null;
};

const empty: Goals = {
  caloriesMode: 'NONE',
  caloriesValue: null,
  caloriesTolerance: null,
  proteinMode: 'NONE',
  proteinValue: null,
  proteinTolerance: null,
  carbsMode: 'NONE',
  carbsValue: null,
  carbsTolerance: null,
  fatMode: 'NONE',
  fatValue: null,
  fatTolerance: null,
};

const MACROS: Array<{
  label: string;
  icon: LucideIcon;
  modeKey: keyof Goals;
  valueKey: keyof Goals;
  unit: string;
}> = [
  { label: 'Calories', icon: Flame, modeKey: 'caloriesMode', valueKey: 'caloriesValue', unit: 'kcal' },
  { label: 'Protéines', icon: Beef, modeKey: 'proteinMode', valueKey: 'proteinValue', unit: 'g' },
  { label: 'Glucides', icon: Croissant, modeKey: 'carbsMode', valueKey: 'carbsValue', unit: 'g' },
  { label: 'Lipides', icon: Droplet, modeKey: 'fatMode', valueKey: 'fatValue', unit: 'g' },
];

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const goals = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiJson<Goals | null>('/api/bff/nutrition-goals'),
  });
  const save = useMutation({
    mutationFn: (body: Goals) =>
      apiJson('/api/bff/nutrition-goals', {
        method: 'PUT',
        body: JSON.stringify({
          ...body,
          caloriesValue: body.caloriesValue ? Number(body.caloriesValue) : null,
          caloriesTolerance: body.caloriesTolerance ? Number(body.caloriesTolerance) : null,
          proteinValue: body.proteinValue ? Number(body.proteinValue) : null,
          proteinTolerance: body.proteinTolerance ? Number(body.proteinTolerance) : null,
          carbsValue: body.carbsValue ? Number(body.carbsValue) : null,
          carbsTolerance: body.carbsTolerance ? Number(body.carbsTolerance) : null,
          fatValue: body.fatValue ? Number(body.fatValue) : null,
          fatTolerance: body.fatTolerance ? Number(body.fatTolerance) : null,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const value = goals.data ?? empty;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Objectifs nutritionnels"
        description="Ces valeurs servent de référence par défaut. Une journée du planning peut les surcharger ponctuellement."
        actions={<SaveStatus pending={save.isPending} saved={save.isSuccess} />}
      />

      {goals.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MACROS.map((macro) => {
            const Icon = macro.icon;
            return (
              <Card key={macro.label} className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="flex size-8 items-center justify-center rounded-lg bg-sage-100 text-sage-600"
                  >
                    <Icon className="size-4" />
                  </span>
                  <p className="font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
                    {macro.label}
                  </p>
                </div>
                <Field label="Type d’objectif">
                  {({ id }) => (
                    <Select
                      id={id}
                      value={String(value[macro.modeKey])}
                      onChange={(e) => save.mutate({ ...value, [macro.modeKey]: e.target.value })}
                    >
                      {GOAL_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {GOAL_MODE_LABELS[mode]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Valeur cible" hint={`En ${macro.unit}. Laisser vide pour ne rien viser.`}>
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder={macro.unit}
                      defaultValue={value[macro.valueKey] ?? ''}
                      onBlur={(e) => save.mutate({ ...value, [macro.valueKey]: e.target.value || null })}
                    />
                  )}
                </Field>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Les champs s'enregistrent a la sortie du focus : il faut le dire. */
function SaveStatus({ pending, saved }: { pending: boolean; saved: boolean }) {
  if (pending) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-ink-500">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Enregistrement…
      </span>
    );
  }
  if (saved) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-sage-600">
        <Check className="size-3.5" aria-hidden />
        Enregistré
      </span>
    );
  }
  return <span className="text-sm text-ink-400">Enregistrement automatique</span>;
}
