'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, differenceInCalendarDays, format, isToday, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  IconButton,
  Meter,
  PageHeader,
  Panel,
  Skeleton,
  cn,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { MEAL_SLOTS, MEAL_SLOT_LABELS, type MealSlot } from '@cuisinons/shared';
import { AddMealDialog } from '@/components/add-meal-dialog';
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
  caloriesValue: string | null;
  proteinValue: string | null;
  carbsValue: string | null;
  fatValue: string | null;
};

type Macros = { kcal: number; protein: number; carbs: number; fat: number };

function iso(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export default function PlanningPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  const selectedDate = days[selectedIndex] ?? days[0]!;
  const meals = mealsQuery.data ?? [];

  function macrosFor(date: Date): Macros {
    const key = iso(date);
    const acc: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const item of meals.filter((m) => m.date.slice(0, 10) === key)) {
      const portion = item.portions.find((p) => p.userId === user?.id);
      const qty = portion ? Number(portion.portions) : 0;
      acc.kcal += item.nutrition.perServing.kcal * qty;
      acc.protein += item.nutrition.perServing.protein * qty;
      acc.carbs += item.nutrition.perServing.carbs * qty;
      acc.fat += item.nutrition.perServing.fat * qty;
    }
    return acc;
  }

  const selectedMacros = macrosFor(selectedDate);
  const goals = goalsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Bonjour ${user?.displayName ?? ''}`}
        title={
          <>
            Semaine du {format(weekStart, 'd MMMM', { locale: fr })} au{' '}
            {format(addDays(weekStart, 6), 'd MMMM', { locale: fr })}
          </>
        }
        actions={
          <>
            <IconButton
              icon={ChevronLeft}
              label="Semaine précédente"
              onClick={() => {
                setWeekStart(addDays(weekStart, -7));
                setSelectedIndex(0);
              }}
            />
            <Button
              variant="glass"
              onClick={() => {
                const now = new Date();
                const start = startOfWeek(now, { weekStartsOn: 1 });
                setWeekStart(start);
                setSelectedIndex(differenceInCalendarDays(now, start));
              }}
            >
              Aujourd’hui
            </Button>
            <IconButton
              icon={ChevronRight}
              label="Semaine suivante"
              onClick={() => {
                setWeekStart(addDays(weekStart, 7));
                setSelectedIndex(0);
              }}
            />
          </>
        }
      />

      <Panel className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {/* first-letter plutot que capitalize : ce dernier mettrait aussi une
              majuscule au mois (« Lundi 14 Septembre »). */}
          <p className="text-sm font-medium text-ink-900 first-letter:uppercase">
            {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
          </p>
          {goals ? null : (
            <Badge tone="peach">Aucun objectif défini</Badge>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meter label="Calories" value={selectedMacros.kcal} target={num(goals?.caloriesValue)} unit="kcal" />
          <Meter label="Protéines" value={selectedMacros.protein} target={num(goals?.proteinValue)} unit="g" />
          <Meter label="Glucides" value={selectedMacros.carbs} target={num(goals?.carbsValue)} unit="g" />
          <Meter label="Lipides" value={selectedMacros.fat} target={num(goals?.fatValue)} unit="g" />
        </div>
      </Panel>

      <OptimizePanel date={iso(selectedDate)} />

      {/* Selecteur de jour mobile : la grille de sept colonnes ne tient pas. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {days.map((day, index) => (
          <button
            key={iso(day)}
            type="button"
            onClick={() => setSelectedIndex(index)}
            aria-current={index === selectedIndex ? 'true' : undefined}
            className={cn(
              'min-w-16 shrink-0 rounded-2xl px-3 py-2 text-center transition duration-200 ease-out-soft',
              index === selectedIndex ? 'bg-ink-900 text-white shadow-soft' : 'glass text-ink-600',
            )}
          >
            <span className="block text-[11px] uppercase tracking-wide opacity-70">
              {format(day, 'EEE', { locale: fr })}
            </span>
            <span className="tabular block text-base font-medium">{format(day, 'd')}</span>
          </button>
        ))}
      </div>

      {mealsQuery.isLoading ? (
        <div className="grid gap-3 lg:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-7 items-start gap-3 lg:grid">
            {days.map((day, index) => (
              <DayCard
                key={iso(day)}
                date={day}
                meals={meals}
                userId={user?.id}
                macros={macrosFor(day)}
                selected={index === selectedIndex}
                onSelect={() => setSelectedIndex(index)}
                onAdd={(slot) => setDialog({ date: iso(day), slot })}
                onRemove={(id) => remove.mutate(id)}
              />
            ))}
          </div>
          <div className="lg:hidden">
            <DayCard
              date={selectedDate}
              meals={meals}
              userId={user?.id}
              macros={selectedMacros}
              selected
              onAdd={(slot) => setDialog({ date: iso(selectedDate), slot })}
              onRemove={(id) => remove.mutate(id)}
            />
          </div>
        </>
      )}

      <AddMealDialog
        open={dialog !== null}
        date={dialog?.date ?? iso(selectedDate)}
        slot={dialog?.slot ?? 'DINNER'}
        onClose={() => setDialog(null)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ['planner'] })}
      />
    </div>
  );
}

function num(value: string | null | undefined): number | null {
  return value ? Number(value) : null;
}

/**
 * Une journee tient dans une seule carte. Sept cartes contenant quatre sections
 * se lisent bien mieux que vingt-huit cartes independantes.
 */
function DayCard({
  date,
  meals,
  userId,
  macros,
  selected,
  onSelect,
  onAdd,
  onRemove,
}: {
  date: Date;
  meals: MealItem[];
  userId?: string;
  macros: Macros;
  selected: boolean;
  onSelect?: () => void;
  onAdd: (slot: MealSlot) => void;
  onRemove: (id: string) => void;
}) {
  const key = iso(date);
  const today = isToday(date);

  return (
    <Card
      className={cn(
        'overflow-hidden p-0 transition duration-300 ease-out-soft',
        selected && 'ring-2 ring-sage-300',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        className="flex w-full items-baseline justify-between gap-2 border-b border-white/70 px-4 py-3 text-left transition-colors duration-200 ease-out-soft enabled:hover:bg-white/50"
      >
        <span className="min-w-0">
          <span
            className={cn(
              'block truncate text-sm font-medium first-letter:uppercase',
              today ? 'text-sage-600' : 'text-ink-900',
            )}
          >
            {format(date, 'EEEE d', { locale: fr })}
          </span>
          {today ? <span className="text-[11px] font-medium text-sage-500">Aujourd’hui</span> : null}
        </span>
        {macros.kcal > 0 ? (
          <span className="tabular shrink-0 text-xs text-ink-500">{Math.round(macros.kcal)} kcal</span>
        ) : null}
      </button>

      <div className="divide-y divide-white/70">
        {MEAL_SLOTS.map((slot) => (
          <SlotSection
            key={slot}
            slot={slot}
            items={meals.filter((m) => m.date.slice(0, 10) === key && m.slot === slot)}
            userId={userId}
            onAdd={() => onAdd(slot)}
            onRemove={onRemove}
          />
        ))}
      </div>
    </Card>
  );
}

function SlotSection({
  slot,
  items,
  userId,
  onAdd,
  onRemove,
}: {
  slot: MealSlot;
  items: MealItem[];
  userId?: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const label = MEAL_SLOT_LABELS[slot];

  // Creneau vide : toute la ligne declenche l'ajout. Le libelle « Ajouter » est
  // omis volontairement, car a sept colonnes la place manque ; l'icone suffit et
  // l'intitule complet reste porte par aria-label.
  if (items.length === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Ajouter une recette au ${label.toLowerCase()}`}
        className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors duration-200 ease-out-soft hover:bg-white/50"
      >
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</span>
        <Plus
          className="size-4 shrink-0 text-ink-300 transition-colors duration-200 ease-out-soft group-hover:text-sage-600"
          aria-hidden
        />
      </button>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</span>
        <IconButton icon={Plus} label={`Ajouter au ${label.toLowerCase()}`} size="sm" variant="ghost" onClick={onAdd} />
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const portion = item.portions.find((p) => p.userId === userId);
          const qty = portion ? Number(portion.portions) : 0;
          return (
            <li
              key={item.id}
              className="group rounded-xl border border-white/70 bg-white/75 px-3 py-2.5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-ink-900">
                  {item.recipe.name}
                </p>
                <IconButton
                  icon={Trash2}
                  label={`Retirer ${item.recipe.name}`}
                  size="sm"
                  variant="ghost"
                  className="-mr-1.5 -mt-1 size-8 text-ink-400 hover:text-tomato-500"
                  onClick={() => onRemove(item.id)}
                />
              </div>
              <p className="tabular mt-1 text-xs text-ink-500">
                {qty.toLocaleString('fr-FR')} portion · {Math.round(item.nutrition.perServing.kcal * qty)} kcal ·{' '}
                {Math.round(item.nutrition.perServing.protein * qty)} g prot.
              </p>
              {!item.nutrition.complete ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-peach-500">
                  <UtensilsCrossed className="size-3" aria-hidden />
                  Valeurs incomplètes
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
