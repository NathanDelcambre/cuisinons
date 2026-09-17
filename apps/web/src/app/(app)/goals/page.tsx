'use client';

import { GOAL_MODES, GOAL_MODE_LABELS, type GoalMode } from '@cuisinons/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

  function Field({
    label,
    modeKey,
    valueKey,
    unit,
  }: {
    label: string;
    modeKey: keyof Goals;
    valueKey: keyof Goals;
    unit: string;
  }) {
    return (
      <div className="glass rounded-[28px] p-5">
        <p className="font-medium">{label}</p>
        <select
          className="mt-3 w-full rounded-2xl border px-3 py-2"
          value={String(value[modeKey])}
          onChange={(e) => save.mutate({ ...value, [modeKey]: e.target.value })}
        >
          {GOAL_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {GOAL_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
        <input
          className="mt-3 w-full rounded-2xl border px-3 py-2"
          placeholder={unit}
          defaultValue={value[valueKey] ?? ''}
          onBlur={(e) => save.mutate({ ...value, [valueKey]: e.target.value || null })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Objectifs nutritionnels</h1>
      <p className="text-sm text-stone-500">Valeurs par défaut, surcharge possible sur une journée depuis le planning.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Calories" modeKey="caloriesMode" valueKey="caloriesValue" unit="kcal" />
        <Field label="Protéines" modeKey="proteinMode" valueKey="proteinValue" unit="g" />
        <Field label="Glucides" modeKey="carbsMode" valueKey="carbsValue" unit="g" />
        <Field label="Lipides" modeKey="fatMode" valueKey="fatValue" unit="g" />
      </div>
    </div>
  );
}
