'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';

type Preview = {
  summary: string;
  before: { protein: number; carbs: number; fat: number; kcal: number };
  after: { protein: number; carbs: number; fat: number; kcal: number };
};

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner'] }),
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

  return (
    <div className="glass rounded-[28px] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Ajustement intelligent</p>
          <p className="text-sm text-stone-500">Proposition visible avant application, jamais silencieuse.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(prefs.data?.enabled)}
            onChange={(e) => save.mutate(e.target.checked)}
          />
          Activer
        </label>
      </div>
      {prefs.data?.enabled ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white" onClick={() => preview.mutate()}>
            Optimiser ma journée
          </button>
          {preview.data ? (
            <>
              <button className="rounded-full px-4 py-2 text-sm glass" onClick={() => apply.mutate()}>
                Appliquer les ajustements
              </button>
              <button className="rounded-full px-4 py-2 text-sm" onClick={() => preview.reset()}>
                Annuler
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {preview.data ? (
        <pre className="mt-4 whitespace-pre-wrap text-sm text-stone-600">{preview.data.summary}</pre>
      ) : null}
    </div>
  );
}
