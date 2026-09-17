'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, differenceInCalendarDays, format, isToday, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, ChevronLeft, ChevronRight, RefreshCw, Trash2, UtensilsCrossed } from 'lucide-react';
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
import {
  MEAL_KIND_LABELS,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  type MealKind,
  type MealSlot,
} from '@cuisinons/shared';
import { AddMealDialog } from '@/components/add-meal-dialog';
import { PlannedMealModal } from '@/components/planned-meal-modal';
import { SlotAddMenu, SLOT_CHROME, type SpecialMealKind } from '@/components/slot-add-menu';
import { OptimizePanel } from '@/components/optimize-panel';

type MealItem = {
  id: string;
  date: string;
  slot: MealSlot;
  kind: MealKind;
  recipe: { id: string; name: string; photoUrl?: string | null } | null;
  portions: Array<{
    id: string;
    userId: string;
    portions: string;
    consumedAt: string | null;
    skipAutoConsume?: boolean;
    user: { displayName: string };
  }>;
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
  const [dialog, setDialog] = useState<{
    date: string;
    slot: MealSlot;
    replaceItemId?: string;
    recipeId?: string;
  } | null>(null);
  const [detail, setDetail] = useState<MealItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const from = iso(weekStart);
  const todayIso = new Date().toISOString().slice(0, 10);
  const settledWeek = useRef<string | null>(null);
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

  const addKind = useMutation({
    mutationFn: async (input: { date: string; slot: MealSlot; kind: SpecialMealKind }) => {
      const users = await apiJson<Array<{ id: string }>>('/api/bff/users');
      return apiJson('/api/bff/planner/items', {
        method: 'POST',
        body: JSON.stringify({
          date: input.date,
          slot: input.slot,
          kind: input.kind,
          portions: users.map((u) => ({ userId: u.id, portions: 1 })),
        }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner'] }),
    onError: (error: Error) => setNotice(error.message),
  });

  // Consommer un repas puise dans les reserves : il faut donc rafraichir aussi
  // le stock et la liste de courses, qui en decoulent.
  const consume = useMutation({
    mutationFn: (input: { portionId: string; consumed: boolean }) =>
      apiJson<{ consumed: boolean; missing: Array<{ name: string }> }>(
        '/api/bff/provisions/consumption',
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['planner'] });
      void queryClient.invalidateQueries({ queryKey: ['pantry'] });
      void queryClient.invalidateQueries({ queryKey: ['shopping'] });
      setNotice(
        data.missing.length === 0
          ? null
          : `Repas déduit, mais tes réserves ne couvraient pas : ${data.missing
              .map((line) => line.name)
              .join(', ')}.`,
      );
    },
    onError: (error: Error) => setNotice(error.message),
  });

  useEffect(() => {
    if (!mealsQuery.isSuccess || settledWeek.current === from) return;
    void apiJson<{ settled: number; missing: Array<{ name: string }> }>(
      '/api/bff/provisions/settle-past',
      { method: 'POST' },
    )
      .then((data) => {
        settledWeek.current = from;
        if (data.settled === 0) return;
        void queryClient.invalidateQueries({ queryKey: ['planner'] });
        void queryClient.invalidateQueries({ queryKey: ['pantry'] });
        void queryClient.invalidateQueries({ queryKey: ['shopping'] });
        setNotice(
          data.missing.length === 0
            ? null
            : `Repas des jours passés déduits, mais tes réserves ne couvraient pas : ${data.missing
                .map((line) => line.name)
                .join(', ')}.`,
        );
      })
      .catch(() => {
        settledWeek.current = null;
      });
  }, [from, mealsQuery.isSuccess, queryClient]);

  const selectedDate = days[selectedIndex] ?? days[0]!;
  const meals = mealsQuery.data ?? [];

  useEffect(() => {
    if (!mealsQuery.isSuccess || settledWeek.current === from) return;
    void apiJson<{ settled: number; missing: Array<{ name: string }> }>(
      '/api/bff/provisions/settle-past',
      { method: 'POST' },
    )
      .then((data) => {
        settledWeek.current = from;
        if (data.settled === 0) return;
        void queryClient.invalidateQueries({ queryKey: ['planner'] });
        void queryClient.invalidateQueries({ queryKey: ['pantry'] });
        void queryClient.invalidateQueries({ queryKey: ['shopping'] });
        setNotice(
          data.missing.length === 0
            ? null
            : `Repas déduit, mais tes réserves ne couvraient pas : ${data.missing
                .map((line) => line.name)
                .join(', ')}.`,
        );
      })
      .catch(() => {
        settledWeek.current = null;
      });
  }, [from, mealsQuery.isSuccess, queryClient]);

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

      {notice ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <p className="text-sm text-ink-600">{notice}</p>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
            Fermer
          </Button>
        </Card>
      ) : null}

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
          <Meter label="Calories" value={selectedMacros.kcal} target={num(goals?.caloriesValue)} unit="kcal" tone="peach" />
          <Meter label="Protéines" value={selectedMacros.protein} target={num(goals?.proteinValue)} unit="g" tone="sage" />
          <Meter label="Glucides" value={selectedMacros.carbs} target={num(goals?.carbsValue)} unit="g" tone="gold" />
          <Meter label="Lipides" value={selectedMacros.fat} target={num(goals?.fatValue)} unit="g" tone="tomato" />
        </div>
      </Panel>

      <OptimizePanel date={iso(selectedDate)} />

      {mealsQuery.isLoading ? (
        <div className="scrollbar-soft -mx-4 overflow-x-auto scroll-smooth px-4 py-3 sm:-mx-8 sm:px-8">
          <div className="flex w-max gap-3">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-[30rem] w-[16.5rem] shrink-0 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : (
        <div className="scrollbar-soft -mx-4 overflow-x-auto overscroll-x-contain scroll-smooth px-4 py-3 sm:-mx-8 sm:px-8">
          <div className="flex w-max items-stretch gap-3">
            {days.map((day, index) => (
              <DayCard
                key={iso(day)}
                date={day}
                meals={meals}
                userId={user?.id}
                macros={macrosFor(day)}
                selected={index === selectedIndex}
                onSelect={() => setSelectedIndex(index)}
                onAddRecipe={(slot) => setDialog({ date: iso(day), slot })}
                onAddKind={(slot, kind) => addKind.mutate({ date: iso(day), slot, kind })}
                onOpenItem={setDetail}
                onChangeRecipe={(item) =>
                  setDialog({
                    date: item.date.slice(0, 10),
                    slot: item.slot,
                    replaceItemId: item.id,
                    recipeId: item.recipe?.id,
                  })
                }
                onRemove={(id) => remove.mutate(id)}
                todayIso={todayIso}
              />
            ))}
          </div>
        </div>
      )}

      <AddMealDialog
        open={dialog !== null}
        date={dialog?.date ?? iso(selectedDate)}
        slot={dialog?.slot ?? 'DINNER'}
        replaceItemId={dialog?.replaceItemId}
        initialRecipeId={dialog?.recipeId}
        onClose={() => setDialog(null)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ['planner'] })}
      />
      <PlannedMealModal
        item={detail}
        validated={detail ? isValidated(detail, detail.portions.find((p) => p.userId === user?.id), todayIso) : false}
        loading={consume.isPending}
        onClose={() => setDetail(null)}
        onCancelValidation={() => {
          const portion = detail?.portions.find((p) => p.userId === user?.id);
          if (!portion) return;
          consume.mutate(
            { portionId: portion.id, consumed: false },
            { onSuccess: () => setDetail(null) },
          );
        }}
        onChangeRecipe={() => {
          if (!detail) return;
          setDialog({
            date: detail.date.slice(0, 10),
            slot: detail.slot,
            replaceItemId: detail.id,
            recipeId: detail.recipe?.id,
          });
          setDetail(null);
        }}
      />
    </div>
  );
}

function isValidated(
  item: MealItem,
  portion: MealItem['portions'][number] | undefined,
  todayIso: string,
) {
  if (portion?.consumedAt) return true;
  if (portion?.skipAutoConsume) return false;
  return item.date.slice(0, 10) < todayIso;
}

function num(value: string | null | undefined): number | null {
  return value ? Number(value) : null;
}

/**
 * Une journee tient dans une seule carte, hauteur et largeur fixes : les sept
 * colonnes defilent a l'horizontale au lieu de se comprimer.
 */
function DayCard({
  date,
  meals,
  userId,
  macros,
  selected,
  onSelect,
  onAddRecipe,
  onAddKind,
  onOpenItem,
  onChangeRecipe,
  onRemove,
  todayIso,
}: {
  date: Date;
  meals: MealItem[];
  userId?: string;
  macros: Macros;
  selected: boolean;
  onSelect?: () => void;
  onAddRecipe: (slot: MealSlot) => void;
  onAddKind: (slot: MealSlot, kind: SpecialMealKind) => void;
  onOpenItem: (item: MealItem) => void;
  onChangeRecipe: (item: MealItem) => void;
  onRemove: (id: string) => void;
  todayIso: string;
}) {
  const key = iso(date);
  const today = isToday(date);

  return (
    <Card
      className={cn(
        'flex h-[30rem] w-[16.5rem] shrink-0 flex-col p-0 transition duration-300 ease-out-soft',
        selected && 'ring-2 ring-sage-300',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        className="flex h-14 w-full shrink-0 items-baseline justify-between gap-2 rounded-t-2xl border-b border-white/70 px-4 py-3 text-left transition-colors duration-200 ease-out-soft enabled:hover:bg-white/50"
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
        {macros.kcal > 0 ? <MacroCounts macros={macros} className="shrink-0 justify-end" /> : null}
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
        {MEAL_SLOTS.map((slot) => (
          <SlotSection
            key={slot}
            slot={slot}
            items={meals.filter((m) => m.date.slice(0, 10) === key && m.slot === slot)}
            userId={userId}
            onAddRecipe={() => onAddRecipe(slot)}
            onAddKind={(kind) => onAddKind(slot, kind)}
            onOpenItem={onOpenItem}
            onChangeRecipe={onChangeRecipe}
            onRemove={onRemove}
            todayIso={todayIso}
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
  onAddRecipe,
  onAddKind,
  onOpenItem,
  onChangeRecipe,
  onRemove,
  todayIso,
}: {
  slot: MealSlot;
  items: MealItem[];
  userId?: string;
  onAddRecipe: () => void;
  onAddKind: (kind: SpecialMealKind) => void;
  onOpenItem: (item: MealItem) => void;
  onChangeRecipe: (item: MealItem) => void;
  onRemove: (id: string) => void;
  todayIso: string;
}) {
  const chrome = SLOT_CHROME[slot];
  const SlotIcon = chrome.icon;
  const label = MEAL_SLOT_LABELS[slot];

  return (
    <div className="flex min-h-0 flex-col">
      {items.length === 0 ? (
        <SlotAddMenu slot={slot} variant="empty" onChooseRecipe={onAddRecipe} onChooseKind={onAddKind} />
      ) : (
        <ul className={cn('min-h-0 space-y-1.5', items.length > 1 && 'scrollbar-soft overflow-y-auto')}>
          {items.map((item) => {
            const portion = item.portions.find((p) => p.userId === userId);
            const qty = portion ? Number(portion.portions) : 0;
            const validated = isValidated(item, portion, todayIso);
            const kind = item.kind ?? 'RECIPE';
            const recipe = kind === 'RECIPE' ? item.recipe : null;
            const title = recipe?.name ?? MEAL_KIND_LABELS[kind];
            return (
              <li
                key={item.id}
                className="group relative flex min-h-[4.75rem] items-start rounded-xl border border-white/70 bg-white/75 px-2.5 py-2 shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => onOpenItem(item)}
                  aria-label={
                    validated ? `${label}, ${title}, validé` : `${label}, ${title}`
                  }
                  className={cn(
                    'flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left',
                    validated ? 'pr-6' : null,
                    'max-md:pr-16',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                      chrome.iconClass,
                    )}
                  >
                    <SlotIcon className="size-3" />
                  </span>
                  {recipe?.photoUrl ? (
                    <img
                      src={recipe.photoUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-lg object-cover"
                      decoding="async"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium leading-snug text-ink-900">{title}</p>
                    {recipe ? (
                      <>
                        <p className="mt-0.5 text-[11px] text-ink-400">
                          {qty.toLocaleString('fr-FR')} portion
                        </p>
                        <MacroCounts
                          macros={{
                            kcal: item.nutrition.perServing.kcal * qty,
                            protein: item.nutrition.perServing.protein * qty,
                            carbs: item.nutrition.perServing.carbs * qty,
                            fat: item.nutrition.perServing.fat * qty,
                          }}
                          className="mt-0.5"
                        />
                      </>
                    ) : null}
                    {recipe && !item.nutrition.complete ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-peach-500">
                        <UtensilsCrossed className="size-3 shrink-0" aria-hidden />
                        Incomplet
                      </p>
                    ) : null}
                  </div>
                </button>
                {validated ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-2 top-2 text-sage-600 transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0 max-md:hidden"
                  >
                    <CheckCheck className="size-4" />
                  </span>
                ) : null}
                <div
                  className={cn(
                    'absolute right-1 top-1 flex rounded-lg bg-white/90 shadow-soft',
                    'pointer-events-none opacity-0 transition-opacity duration-150',
                    'group-hover:pointer-events-auto group-hover:opacity-100',
                    'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
                    'max-md:pointer-events-auto max-md:opacity-100',
                  )}
                >
                  {validated ? (
                    <span
                      aria-hidden
                      className="hidden size-8 items-center justify-center text-sage-600 max-md:flex"
                    >
                      <CheckCheck className="size-4" />
                    </span>
                  ) : null}
                  <IconButton
                    icon={RefreshCw}
                    label={`Changer ${title}`}
                    size="sm"
                    variant="ghost"
                    className="size-8 text-ink-400 hover:text-sage-600"
                    onClick={() => onChangeRecipe(item)}
                  />
                  <IconButton
                    icon={Trash2}
                    label={`Retirer ${title}`}
                    size="sm"
                    variant="ghost"
                    className="size-8 text-ink-400 hover:text-tomato-500"
                    onClick={() => onRemove(item.id)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const MACRO_LINE = [
  { key: 'kcal', suffix: 'kcal', className: 'text-peach-500' },
  { key: 'protein', suffix: 'P', className: 'text-sage-600' },
  { key: 'carbs', suffix: 'G', className: 'text-ink-800' },
  { key: 'fat', suffix: 'L', className: 'text-tomato-500' },
] as const;

function MacroCounts({ macros, className }: { macros: Macros; className?: string }) {
  return (
    <p className={cn('tabular flex flex-nowrap items-baseline gap-x-1 whitespace-nowrap text-[11px] leading-none', className)}>
      {MACRO_LINE.map((item) => (
        <span key={item.key} className={cn('font-bold', item.className)}>
          {Math.round(macros[item.key])}
          {item.suffix === 'kcal' ? ' kcal' : ` ${item.suffix}`}
        </span>
      ))}
    </p>
  );
}
