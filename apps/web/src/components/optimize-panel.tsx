'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { Button, Card, Inset, Switch, cn, transitions } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';

type Macros = { protein: number; carbs: number; fat: number; kcal: number };
type Preview = { summary: string; before: Macros; after: Macros };

const ROWS = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protéines', unit: 'g' },
  { key: 'carbs', label: 'Glucides', unit: 'g' },
  { key: 'fat', label: 'Lipides', unit: 'g' },
] as const;

export function OptimizePanel({ date }: { date: string }) {
  const queryClient = useQueryClient();
  const [enabledOverride, setEnabledOverride] = useState<boolean | null>(null);

  const preview = useMutation({
    mutationFn: () =>
      apiJson<Preview>('/api/bff/optimization/day/preview', {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),
  });
  const apply = useMutation({
    mutationFn: () =>
      apiJson('/api/bff/optimization/day/apply', {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),
    onSuccess: () => {
      preview.reset();
      return queryClient.invalidateQueries({ queryKey: ['planner'] });
    },
  });
  const prefs = useQuery({
    queryKey: ['opt-prefs'],
    queryFn: () => apiJson<{ enabled: boolean; allowAutoAdd: boolean }>('/api/bff/optimization/preferences'),
  });
  const save = useMutation({
    mutationFn: (enabled: boolean) =>
      apiJson('/api/bff/optimization/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          enabled,
          allowAutoAdd: prefs.data?.allowAutoAdd ?? true,
          minPortionMultiplier: 0.5,
          maxPortionMultiplier: 2,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opt-prefs'] }),
  });

  const enabled = enabledOverride ?? Boolean(prefs.data?.enabled);
  // Capture locale : le typage ne conserve pas l'affinement d'une propriete
  // mutable a l'interieur des fonctions passees a map().
  const proposal = preview.data;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-peach-200 text-peach-500"
          >
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900">Ajustement intelligent</p>
            <p className="mt-0.5 text-sm text-ink-500">
              La proposition est toujours visible avant d’être appliquée, jamais silencieuse.
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          label="Activer"
          onChange={(next) => {
            setEnabledOverride(next);
            save.mutate(next);
            if (!next) preview.reset();
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {enabled ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transitions.soft}
            className="overflow-hidden"
          >
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="accent"
                icon={Sparkles}
                loading={preview.isPending}
                onClick={() => preview.mutate()}
              >
                Optimiser ma journée
              </Button>
              {proposal ? (
                <>
                  <Button variant="glass" icon={Check} loading={apply.isPending} onClick={() => apply.mutate()}>
                    Appliquer
                  </Button>
                  <Button variant="ghost" icon={X} onClick={() => preview.reset()}>
                    Annuler
                  </Button>
                </>
              ) : null}
            </div>

            {proposal ? (
              <Inset className="mt-4 p-4">
                <p className="whitespace-pre-wrap text-sm text-ink-600">{proposal.summary}</p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {ROWS.map((row) => {
                    const before = proposal.before[row.key];
                    const after = proposal.after[row.key];
                    const delta = Math.round(after) - Math.round(before);
                    return (
                      <div key={row.key}>
                        <dt className="text-xs font-medium text-ink-500">{row.label}</dt>
                        <dd className="tabular mt-1 flex items-center gap-1.5 text-sm text-ink-900">
                          <span className="text-ink-400">{Math.round(before)}</span>
                          <ArrowRight className="size-3.5 text-ink-400" aria-hidden />
                          <span className="font-medium">
                            {Math.round(after)} {row.unit}
                          </span>
                          {delta !== 0 ? (
                            <span className={cn('text-xs', delta > 0 ? 'text-sage-600' : 'text-peach-500')}>
                              {delta > 0 ? '+' : ''}
                              {delta}
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </Inset>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
