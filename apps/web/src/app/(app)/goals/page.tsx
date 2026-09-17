'use client';

import { GOAL_MODES, GOAL_MODE_LABELS, type GoalMode } from '@cuisinons/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Check, Croissant, Droplet, Flame, Beef, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, Field, Input, PageHeader, Select, Skeleton, transitions, cn } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewUserId, setViewUserId] = useState<string | null>(null);
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
          caloriesValue: body.caloriesValue ? Number(body.caloriesValue) : null,
          caloriesTolerance: body.caloriesTolerance ? Number(body.caloriesTolerance) : null,
          proteinValue: body.proteinValue ? Number(body.proteinValue) : null,
          proteinTolerance: body.proteinTolerance ? Number(body.proteinTolerance) : null,
          carbsValue: body.carbsValue ? Number(body.carbsValue) : null,
          carbsTolerance: body.carbsTolerance ? Number(body.carbsTolerance) : null,
          fatValue: body.fatValue ? Number(body.fatValue) : null,
          fatTolerance: body.fatTolerance ? Number(body.fatTolerance) : null,
        }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });

  const value = goals.data ?? empty;
  const otherName = selected?.displayName ?? 'l’autre';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Objectifs nutritionnels"
        description={
          isSelf
            ? 'Ces valeurs servent de référence par défaut. Une journée du planning peut les surcharger ponctuellement.'
            : `Les objectifs de ${otherName}. Consultation uniquement — ${otherName} les modifie depuis son compte.`
        }
        actions={
          isSelf ? <SaveStatus pending={save.isPending} saved={save.isSuccess} /> : null
        }
      />

      {household.data && household.data.length > 1 ? (
        <PersonSwitch
          people={household.data}
          selectedId={selectedId}
          selfId={user?.id}
          onChange={setViewUserId}
        />
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
                      disabled={!isSelf}
                      value={String(value[macro.modeKey]) as GoalMode}
                      options={GOAL_MODES.map((mode) => ({
                        value: mode,
                        label: GOAL_MODE_LABELS[mode],
                      }))}
                      onChange={(next) => save.mutate({ ...value, [macro.modeKey]: next })}
                    />
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
                      readOnly={!isSelf}
                      disabled={!isSelf}
                      defaultValue={value[macro.valueKey] ?? ''}
                      onBlur={(e) => {
                        if (!isSelf) return;
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
    </div>
  );
}

function PersonSwitch({
  people,
  selectedId,
  selfId,
  onChange,
}: {
  people: HouseholdUser[];
  selectedId?: string;
  selfId?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Personne"
      className="glass inline-flex gap-1 rounded-full p-1"
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
                className="absolute inset-0 rounded-full bg-white shadow-soft"
              />
            ) : null}
            <Avatar
              name={person.displayName}
              src={person.avatarUrl}
              className="relative size-8 rounded-full text-xs"
            />
            <span className="relative">
              {person.displayName}
              {person.id === selfId ? (
                <span className="text-ink-400"> · toi</span>
              ) : null}
            </span>
          </button>
        );
      })}
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
