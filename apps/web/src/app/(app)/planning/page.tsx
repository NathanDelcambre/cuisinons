'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiJson } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { MEAL_SLOT_LABELS, type MealSlot } from '@cuisinons/shared';
import { AddMealDialog } from '@/components/add-meal-dialog';
import { MacroBars } from '@/components/macro-bars';
import { OptimizePanel } from '@/components/optimize-panel';

type MealItem = {
  id: string;
  date: string;
  slot: MealSlot;
  recipe: { id: string; name: string; photoUrl?: string | null };
  portions: Array<{ userId: string; portions: string; user: { displayName: string } }>;
  nutrition: { perServing: { kcal: number; protein: number; carbs: number; fat: number }; complete: boolean };
};

type Goal = {
  caloriesMode: string;
  caloriesValue: string | null;
  proteinMode: string;
  proteinValue: string | null;
  carbsMode: string;
  carbsValue: string | null;
  fatMode: string;
  fatValue: string | null;
};

function iso(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export default function PlanningPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [mobileDay, setMobileDay] = useState(0);
  const [dialog, setDialog] = useState<{ date: string; slot: MealSlot } | null>(null);
  const queryClient = useQueryClient();
  const from = iso(weekStart);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const mealsQuery = useQuery({
    queryKey: ['planner', from],
    queryFn: () => apiJson<MealItem[]>(`/api/bff/planner/week?from=${from}`),
  });
  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiJson<Goal | null>('/api/bff/nutrition-goals'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiJson(`/api/bff/planner/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner'] }),
  });

  const selectedDate = days[mobileDay] ?? days[0]!;
  const meals = mealsQuery.data ?? [];

  function macrosFor(date: Date) {
    const key = iso(date);
    const items = meals.filter((m) => m.date.slice(0, 10) === key);
    const acc = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const item of items) {
      const portion = item.portions.find((p) => p.userId === user?.id);
      const qty = portion ? Number(portion.portions) : 0;
      acc.kcal += item.nutrition.perServing.kcal * qty;
      acc.protein += item.nutrition.perServing.protein * qty;
      acc.carbs += item.nutrition.perServing.carbs * qty;
      acc.fat += item.nutrition.perServing.fat * qty;
    }
    return acc;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">Bonjour {user?.displayName ?? ''}</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Semaine du {format(weekStart, 'd MMMM', { locale: fr })} au{' '}
            {format(addDays(weekStart, 6), 'd MMMM', { locale: fr })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="glass rounded-full p-2" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semaine précédente">
            <ChevronLeft className="size-4" />
          </button>
          <button className="glass rounded-full px-4 py-2 text-sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Aujourd’hui
          </button>
          <button className="glass rounded-full p-2" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semaine suivante">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      {goalsQuery.data ? <MacroBars actual={macrosFor(selectedDate)} goals={goalsQuery.data} /> : null}
      <OptimizePanel date={iso(selectedDate)} />

      <div className="flex gap-2 overflow-x-auto lg:hidden">
        {days.map((day, index) => (
          <button
            key={iso(day)}
            onClick={() => setMobileDay(index)}
            className={`min-w-14 rounded-2xl px-3 py-2 text-sm ${index === mobileDay ? 'bg-stone-900 text-white' : 'glass'}`}
          >
            <div className="text-[11px] uppercase">{format(day, 'EEE', { locale: fr })}</div>
            <div className="font-medium">{format(day, 'd')}</div>
          </button>
        ))}
      </div>

      <div className="hidden grid-cols-7 gap-3 lg:grid">
        {days.map((day) => (
          <DayColumn
            key={iso(day)}
            date={day}
            meals={meals}
            userId={user?.id}
            onAdd={(slot) => setDialog({ date: iso(day), slot })}
            onRemove={(id) => remove.mutate(id)}
          />
        ))}
      </div>
      <div className="lg:hidden">
        <DayColumn
          date={selectedDate}
          meals={meals}
          userId={user?.id}
          onAdd={(slot) => setDialog({ date: iso(selectedDate), slot })}
          onRemove={(id) => remove.mutate(id)}
        />
      </div>
      {dialog ? (
        <AddMealDialog
          date={dialog.date}
          slot={dialog.slot}
          onClose={() => setDialog(null)}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ['planner'] })}
        />
      ) : null}
    </div>
  );
}

function DayColumn({
  date,
  meals,
  userId,
  onAdd,
  onRemove,
}: {
  date: Date;
  meals: MealItem[];
  userId?: string;
  onAdd: (slot: MealSlot) => void;
  onRemove: (id: string) => void;
}) {
  const key = iso(date);
  return (
    <section className="space-y-3">
      <h2 className="hidden text-sm font-medium capitalize lg:block">{format(date, 'EEEE d', { locale: fr })}</h2>
      {(Object.keys(MEAL_SLOT_LABELS) as MealSlot[]).map((slot) => {
        const items = meals.filter((m) => m.date.slice(0, 10) === key && m.slot === slot);
        return (
          <div key={slot} className="glass rounded-3xl p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-stone-500">
              <span>{MEAL_SLOT_LABELS[slot]}</span>
              <button className="text-stone-900" onClick={() => onAdd(slot)}>
                Ajouter
              </button>
            </div>
            {items.length === 0 ? (
              <button
                className="w-full rounded-2xl border border-dashed border-stone-200 px-3 py-6 text-left text-sm text-stone-400"
                onClick={() => onAdd(slot)}
              >
                Ajouter une recette
              </button>
            ) : (
              items.map((item) => {
                const portion = item.portions.find((p) => p.userId === userId);
                const qty = portion ? Number(portion.portions) : 0;
                return (
                  <article key={item.id} className="mb-2 rounded-2xl bg-white/70 p-3 last:mb-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{item.recipe.name}</p>
                      <button className="text-xs text-stone-400" onClick={() => onRemove(item.id)}>
                        Retirer
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {qty} portion · {Math.round(item.nutrition.perServing.kcal * qty)} kcal ·{' '}
                      {Math.round(item.nutrition.perServing.protein * qty)} g prot.
                    </p>
                  </article>
                );
              })
            )}
          </div>
        );
      })}
    </section>
  );
}
