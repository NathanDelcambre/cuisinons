'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { Button, Card, Inset, cn, transitions } from '@cuisinons/ui';
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

  const proposal = preview.data;

  return (
    <div className="space-y-3">
      <Button
        variant="glass"
        icon={Sparkles}
        loading={preview.isPending}
        onClick={() => preview.mutate()}
      >
        Ajustement intelligent
      </Button>

      <AnimatePresence initial={false}>
        {proposal ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transitions.soft}
            className="overflow-hidden"
          >
            <Card className="space-y-4">
              <Inset className="p-4">
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
              <div className="flex flex-wrap gap-2">
                <Button variant="accent" icon={Check} loading={apply.isPending} onClick={() => apply.mutate()}>
                  Appliquer
                </Button>
                <Button variant="ghost" icon={X} onClick={() => preview.reset()}>
                  Annuler
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
