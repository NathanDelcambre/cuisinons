'use client';

import { GOAL_MODES, GOAL_MODE_LABELS, type GoalMode } from '@cuisinons/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, Card, Field, Input, PageHeader, Select, Skeleton, transitions, cn } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';
import { MacroIcon, type MacroKey } from '@/components/macro-icon';
import { EstimateMacrosModal, type BodyProfile } from '@/components/estimate-macros-modal';

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

type HouseholdUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
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
  kind: MacroKey;
  modeKey: 'caloriesMode' | 'proteinMode' | 'carbsMode' | 'fatMode';
  valueKey: 'caloriesValue' | 'proteinValue' | 'carbsValue' | 'fatValue';
  unit: string;
  iconWrap: string;
}> = [
  { label: 'Calories', kind: 'kcal', modeKey: 'caloriesMode', valueKey: 'caloriesValue', unit: 'kcal', iconWrap: 'bg-peach-200/80' },
  { label: 'Protéines', kind: 'protein', modeKey: 'proteinMode', valueKey: 'proteinValue', unit: 'grammes', iconWrap: 'bg-sage-100' },
  { label: 'Glucides', kind: 'carbs', modeKey: 'carbsMode', valueKey: 'carbsValue', unit: 'grammes', iconWrap: 'bg-ink-100' },
  { label: 'Lipides', kind: 'fat', modeKey: 'fatMode', valueKey: 'fatValue', unit: 'grammes', iconWrap: 'bg-tomato-100' },
];

function toNullableNumber(value: string | number | null) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function GoalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const household = useQuery({
    queryKey: ['users'],
    queryFn: () => apiJson<HouseholdUser[]>('/api/bff/users'),
  });
  const selectedId = viewUserId ?? user?.id;
  const selected = household.data?.find((member) => member.id === selectedId);
  const isSelf = !viewUserId || viewUserId === user?.id;

  const goals = useQuery({
    queryKey: ['goals', selectedId],
    queryFn: () =>
      apiJson<Goals | null>(`/api/bff/nutrition-goals?userId=${encodeURIComponent(selectedId!)}`),
    enabled: Boolean(selectedId),
  });
  const save = useMutation({
    mutationFn: (body: Goals) => {
      if (!isSelf) {
        return Promise.reject(new Error('Consultation uniquement.'));
      }
      return apiJson('/api/bff/nutrition-goals', {
        method: 'PUT',
        body: JSON.stringify({
          ...body,
          caloriesValue: toNullableNumber(body.caloriesValue),
          caloriesTolerance: toNullableNumber(body.caloriesTolerance),
          proteinValue: toNullableNumber(body.proteinValue),
          proteinTolerance: toNullableNumber(body.proteinTolerance),
          carbsValue: toNullableNumber(body.carbsValue),
          carbsTolerance: toNullableNumber(body.carbsTolerance),
          fatValue: toNullableNumber(body.fatValue),
          fatTolerance: toNullableNumber(body.fatTolerance),
        }),
      });
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ['goals', selectedId] });
      const previous = queryClient.getQueryData<Goals | null>(['goals', selectedId]);
      queryClient.setQueryData(['goals', selectedId], body);
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['goals', selectedId], context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const body = useQuery({
    queryKey: ['me-body'],
    queryFn: () =>
      apiJson<BodyProfile & { id: string }>('/api/bff/me'),
    enabled: Boolean(user?.id),
  });
  const applyEstimate = useMutation({
    mutationFn: (input: { heightCm: number; weightKg: number; targetWeightKg: number | null }) =>
      apiJson('/api/bff/nutrition-goals/from-body', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goals'] }),
        queryClient.invalidateQueries({ queryKey: ['me-body'] }),
      ]);
      setEstimatorOpen(false);
    },
  });

  const value = goals.data ?? empty;
  const otherName = selected?.displayName ?? 'l’autre';

  useEffect(() => {
    if (!isSelf || !goals.data || save.isPending) return;
    const next = { ...goals.data };
    let dirty = false;
    for (const macro of MACROS) {
      if (next[macro.modeKey] !== 'NONE') continue;
      const amount = toNullableNumber(next[macro.valueKey]);
      if (amount !== null && amount !== 0) {
        next[macro.valueKey] = '0';
        dirty = true;
      }
    }
    if (dirty) save.mutate(next);
  }, [goals.data, isSelf, save.isPending, save.mutate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Objectifs nutritionnels"
        description={
          isSelf
            ? 'Vos objectifs de macros par jour.'
            : `Les objectifs de ${otherName}. Consultation uniquement.`
        }
        actionsBesideTitle
        actions={
          household.data && household.data.length > 1 ? (
            <PersonSwitch
              people={household.data}
              selectedId={selectedId}
              onChange={setViewUserId}
            />
          ) : null
        }
      />

      {isSelf ? (
        <div>
          <Button variant="glass" icon={Sparkles} onClick={() => setEstimatorOpen(true)}>
            Estimer mes macros
          </Button>
        </div>
      ) : null}

      {applyEstimate.error ? (
        <p role="alert" className="text-sm font-medium text-tomato-500">
          {applyEstimate.error.message}
        </p>
      ) : null}

      {goals.isLoading || !selectedId ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : (
        <div key={selectedId} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MACROS.map((macro) => {
            const mode = value[macro.modeKey];
            const noGoal = mode === 'NONE';
            return (
              <Card key={macro.label} className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg',
                      macro.iconWrap,
                    )}
                  >
                    <MacroIcon kind={macro.kind} className="size-4" />
                  </span>
                  <p className="font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
                    {macro.label}
                  </p>
                </div>
                <Field label="Type d’objectif">
                  {({ id }) => (
                    <Select
                      id={id}
                      disabled={!isSelf}
                      value={mode}
                      options={GOAL_MODES.map((option) => ({
                        value: option,
                        label: GOAL_MODE_LABELS[option],
                      }))}
                      onChange={(next) => {
                        const nextMode = next as GoalMode;
                        save.mutate({
                          ...value,
                          [macro.modeKey]: nextMode,
                          ...(nextMode === 'NONE' ? { [macro.valueKey]: '0' } : {}),
                        });
                      }}
                    />
                  )}
                </Field>
                <Field
                  label="Valeur cible"
                  hint={noGoal ? 'Sans objectif, la valeur n’est pas utilisée.' : undefined}
                >
                  {({ id, describedBy }) => (
                    <Input
                      key={`${selectedId}-${macro.valueKey}-${mode}-${value[macro.valueKey] ?? ''}`}
                      id={id}
                      aria-describedby={describedBy}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      suffix={macro.unit}
                      readOnly={!isSelf || noGoal}
                      disabled={!isSelf || noGoal}
                      defaultValue={noGoal ? '0' : (value[macro.valueKey] ?? '')}
                      onBlur={(e) => {
                        if (!isSelf || noGoal) return;
                        save.mutate({ ...value, [macro.valueKey]: e.target.value || null });
                      }}
                    />
                  )}
                </Field>
              </Card>
            );
          })}
        </div>
      )}

      <EstimateMacrosModal
        open={estimatorOpen}
        profile={body.data ?? null}
        pending={applyEstimate.isPending}
        onClose={() => setEstimatorOpen(false)}
        onConfirm={(input) => applyEstimate.mutate(input)}
      />
    </div>
  );
}

function PersonSwitch({
  people,
  selectedId,
  onChange,
}: {
  people: HouseholdUser[];
  selectedId?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Personne"
      className="segmented-track inline-flex rounded-full p-[3px]"
    >
      {people.map((person) => {
        const active = person.id === selectedId;
        return (
          <button
            key={person.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(person.id)}
            className={cn(
              'relative flex min-h-11 items-center gap-2 rounded-full py-1 pl-1.5 pr-3.5 text-sm font-medium transition-colors duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
              active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {active ? (
              <motion.span
                layoutId="goals-person"
                transition={transitions.spring}
                className="segmented-thumb absolute inset-0 rounded-full"
              />
            ) : null}
            <Avatar
              name={person.displayName}
              src={person.avatarUrl}
              className={cn(
                'relative size-8 rounded-full text-xs transition-opacity duration-200 ease-out-soft',
                active ? 'opacity-100' : 'opacity-70',
              )}
            />
            <span className="relative">{person.displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
