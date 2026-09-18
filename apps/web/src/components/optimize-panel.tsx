'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Sparkles, Undo2, X } from 'lucide-react';
import { Button, Inset, Modal, cn } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';

type Macros = { protein: number; carbs: number; fat: number; kcal: number };
type DayPreview = { summary: string; before: Macros; after: Macros };
type WeekPreview = { mode: string; days: Array<{ date: string; result: DayPreview }> };

const ROWS = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protéines', unit: 'g' },
  { key: 'carbs', label: 'Glucides', unit: 'g' },
  { key: 'fat', label: 'Lipides', unit: 'g' },
] as const;

type Mode = 'day' | 'fill' | 'replace';

export function OptimizePanel({
  open,
  date,
  weekFrom,
  onClose,
}: {
  open: boolean;
  date: string;
  weekFrom: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('day');
  const [day, setDay] = useState(date);
  const [confirmReplace, setConfirmReplace] = useState(false);

  useEffect(() => {
    setDay(date);
  }, [date]);

  const undoStatus = useQuery({
    queryKey: ['optimization-undo'],
    queryFn: () => apiJson<{ available: boolean }>('/api/bff/optimization/undo'),
    enabled: open,
  });

  const preview = useMutation({
    mutationFn: async () => {
      if (mode === 'day') {
        return apiJson<DayPreview>('/api/bff/optimization/day/preview', {
          method: 'POST',
          body: JSON.stringify({ date: day }),
        });
      }
      return apiJson<WeekPreview>('/api/bff/optimization/week/preview', {
        method: 'POST',
        body: JSON.stringify({ from: weekFrom, mode: mode === 'fill' ? 'fill' : 'replace' }),
      });
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (mode === 'day') {
        return apiJson('/api/bff/optimization/day/apply', {
          method: 'POST',
          body: JSON.stringify({ date: day }),
        });
      }
      return apiJson('/api/bff/optimization/week/apply', {
        method: 'POST',
        body: JSON.stringify({ from: weekFrom, mode: mode === 'fill' ? 'fill' : 'replace' }),
      });
    },
    onSuccess: () => {
      preview.reset();
      setConfirmReplace(false);
      void queryClient.invalidateQueries({ queryKey: ['planner'] });
      void queryClient.invalidateQueries({ queryKey: ['optimization-undo'] });
    },
  });

  const undo = useMutation({
    mutationFn: () => apiJson('/api/bff/optimization/undo', { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['planner'] });
      void queryClient.invalidateQueries({ queryKey: ['optimization-undo'] });
    },
  });

  const dayPreview = preview.data && 'summary' in preview.data ? preview.data : null;
  const weekPreview = preview.data && 'days' in preview.data ? preview.data : null;

  return (
    <Modal
      open={open}
      title="Ajustement intelligent"
      description="Propose des repas pour coller à tes objectifs, sans LLM."
      onClose={onClose}
      footer={
        <>
          {undoStatus.data?.available ? (
            <Button variant="glass" icon={Undo2} loading={undo.isPending} onClick={() => undo.mutate()}>
              Annuler la dernière proposition
            </Button>
          ) : null}
          <Button variant="ghost" icon={X} onClick={onClose}>
            Fermer
          </Button>
          {preview.data ? (
            mode === 'replace' && !confirmReplace ? (
              <Button variant="accent" onClick={() => setConfirmReplace(true)}>
                Confirmer le remplacement
              </Button>
            ) : (
              <Button icon={Check} loading={apply.isPending} onClick={() => apply.mutate()}>
                Appliquer
              </Button>
            )
          ) : (
            <Button icon={Sparkles} loading={preview.isPending} onClick={() => preview.mutate()}>
              Prévisualiser
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {(
          [
            { id: 'day', title: 'Un jour', help: 'Ajuste le jour choisi, y compris les portions.' },
            { id: 'fill', title: 'Combler la semaine', help: 'Remplit seulement les créneaux vides, sans toucher aux repas déjà posés.' },
            { id: 'replace', title: 'Tout remplacer', help: 'Écrase les recettes de la semaine (pas restaurant / sauté / imposé).' },
          ] as const
        ).map((option) => (
          <label
            key={option.id}
            className={cn(
              'flex cursor-pointer gap-3 rounded-2xl border p-3',
              mode === option.id ? 'border-sage-400 bg-sage-50/80' : 'border-white/80 bg-white/60',
            )}
          >
            <input
              type="radio"
              name="optimize-mode"
              className="mt-1"
              checked={mode === option.id}
              onChange={() => {
                setMode(option.id);
                preview.reset();
                setConfirmReplace(false);
              }}
            />
            <span>
              <span className="block text-sm font-medium text-ink-900">{option.title}</span>
              <span className="mt-0.5 block text-xs text-ink-500">{option.help}</span>
            </span>
          </label>
        ))}
      </div>

      {mode === 'day' ? (
        <div className="mt-4">
          <label className="text-sm font-medium text-ink-700" htmlFor="optimize-day">
            Jour
          </label>
          <input
            id="optimize-day"
            type="date"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              preview.reset();
            }}
            className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-ink-100 px-4 text-sm hover:border-ink-300 hover:bg-white focus:border-sage-300 focus:bg-white"
          />
        </div>
      ) : null}

      {mode === 'replace' && confirmReplace ? (
        <p role="alert" className="mt-4 text-sm font-medium text-tomato-500">
          Les recettes de la semaine seront remplacées. Les repas restaurant, sautés ou imposés restent.
        </p>
      ) : null}

      {dayPreview ? (
        <Inset className="mt-4 p-4">
          <PreviewBlock preview={dayPreview} />
        </Inset>
      ) : null}
      {weekPreview ? (
        <div className="mt-4 space-y-3">
          {weekPreview.days.map((entry) => (
            <Inset key={entry.date} className="p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">{entry.date}</p>
              <PreviewBlock preview={entry.result} />
            </Inset>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

function PreviewBlock({ preview }: { preview: DayPreview }) {
  return (
    <>
      <p className="whitespace-pre-wrap text-sm text-ink-600">{preview.summary}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {ROWS.map((row) => {
          const before = preview.before[row.key];
          const after = preview.after[row.key];
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
    </>
  );
}
