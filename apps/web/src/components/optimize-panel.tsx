'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Sparkles, Undo2, X } from 'lucide-react';
import { Button, Inset, Modal, cn } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';

type Macros = { protein: number; carbs: number; fat: number; kcal: number };
type DayPreview = { summary: string; before: Macros; after: Macros };
type WeekPreview = { mode: string; days: Array<{ date: string; result: DayPreview }> };
type PersonResult<T> = { userId: string; displayName: string; result: T };
type PeoplePreview<T> = { people: PersonResult<T>[] };

function isDayPreview(value: unknown): value is DayPreview {
  return Boolean(value && typeof value === 'object' && 'summary' in value);
}

function isWeekPreview(value: unknown): value is WeekPreview {
  return Boolean(value && typeof value === 'object' && 'days' in value && !('people' in value));
}

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
  people,
  selfId,
  subjectId,
  onClose,
}: {
  open: boolean;
  date: string;
  weekFrom: string;
  people: Array<{ id: string; displayName: string }>;
  selfId?: string;
  subjectId?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('day');
  const [day, setDay] = useState(date);
  const [audience, setAudience] = useState(subjectId ?? selfId ?? '');
  const [confirmReplace, setConfirmReplace] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAudience(subjectId ?? selfId ?? '');
  }, [open, subjectId, selfId]);

  useEffect(() => {
    setDay(date);
  }, [date]);

  const undoStatus = useQuery({
    queryKey: ['optimization-undo'],
    queryFn: () => apiJson<{ available: boolean }>('/api/bff/optimization/undo'),
    enabled: open,
  });

  const userIds =
    people.length > 1 && audience === 'all'
      ? people.map((person) => person.id)
      : [audience || selfId].filter((id): id is string => Boolean(id));

  const preview = useMutation({
    mutationFn: async () => {
      if (mode === 'day') {
        return apiJson<DayPreview | PeoplePreview<DayPreview>>('/api/bff/optimization/day/preview', {
          method: 'POST',
          body: JSON.stringify({ date: day, userIds }),
        });
      }
      return apiJson<WeekPreview | PeoplePreview<WeekPreview>>('/api/bff/optimization/week/preview', {
        method: 'POST',
        body: JSON.stringify({
          from: weekFrom,
          mode: mode === 'fill' ? 'fill' : 'replace',
          userIds,
        }),
      });
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (mode === 'day') {
        return apiJson('/api/bff/optimization/day/apply', {
          method: 'POST',
          body: JSON.stringify({ date: day, userIds }),
        });
      }
      return apiJson('/api/bff/optimization/week/apply', {
        method: 'POST',
        body: JSON.stringify({
          from: weekFrom,
          mode: mode === 'fill' ? 'fill' : 'replace',
          userIds,
        }),
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

  const dayPreview = isDayPreview(preview.data) ? preview.data : null;
  const weekPreview = isWeekPreview(preview.data) ? preview.data : null;
  const peoplePreview =
    preview.data && typeof preview.data === 'object' && 'people' in preview.data
      ? preview.data.people
      : null;

  return (
    <Modal
      open={open}
      title="Ajustement intelligent"
      description="Propose des repas pour coller aux objectifs, sans LLM."
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
      {people.length > 1 ? (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-ink-700">Pour qui</p>
          <div className="flex flex-wrap gap-2">
            {people.map((person) => (
              <AudienceChoice
                key={person.id}
                checked={audience === person.id}
                label={person.id === selfId ? 'Pour moi seulement' : `Pour ${person.displayName} seulement`}
                onChange={() => {
                  setAudience(person.id);
                  preview.reset();
                  setConfirmReplace(false);
                }}
              />
            ))}
            <AudienceChoice
              checked={audience === 'all'}
              label="Pour les deux"
              onChange={() => {
                setAudience('all');
                preview.reset();
                setConfirmReplace(false);
              }}
            />
          </div>
        </div>
      ) : null}
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
      {weekPreview ? <WeekBlocks preview={weekPreview} /> : null}
      {peoplePreview ? (
        <div className="mt-4 space-y-4">
          {peoplePreview.map((person) => (
            <div key={person.userId}>
              <p className="mb-2 text-sm font-medium text-ink-800">{person.displayName}</p>
              {isDayPreview(person.result) ? (
                <Inset className="p-4">
                  <PreviewBlock preview={person.result} />
                </Inset>
              ) : isWeekPreview(person.result) ? (
                <WeekBlocks preview={person.result} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

function AudienceChoice({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        'cursor-pointer rounded-full border px-3 py-1.5 text-sm',
        checked ? 'border-sage-400 bg-sage-50/80 text-ink-900' : 'border-white/80 bg-white/60 text-ink-600',
      )}
    >
      <input type="radio" name="optimize-audience" className="sr-only" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function WeekBlocks({ preview }: { preview: WeekPreview }) {
  return (
    <div className="mt-4 space-y-3">
      {preview.days.map((entry) => (
        <Inset key={entry.date} className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">{entry.date}</p>
          <PreviewBlock preview={entry.result} />
        </Inset>
      ))}
    </div>
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
