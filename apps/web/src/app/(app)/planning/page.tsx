'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, differenceInCalendarDays, format, isToday, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Carrot,
  ChevronLeft,
  ChevronRight,
  Clock,
  CookingPot,
  RefreshCw,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  IconButton,
  MacroRing,
  Meter,
  PageHeader,
  Panel,
  Skeleton,
  cn,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import {
  avatarUrlForEmail,
  MEAL_KIND_LABELS,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  mealsForEater,
  weekMacroAverages,
  type MealKind,
  type MealSlot,
  type QuantityUnit,
} from '@cuisinons/shared';
import { AddMealDialog } from '@/components/add-meal-dialog';
import { Avatar } from '@/components/avatar';
import { ManualMealDialog } from '@/components/manual-meal-dialog';
import { PlannedMealModal } from '@/components/planned-meal-modal';
import { SlotAddMenu, SLOT_CHROME, type SpecialMealKind } from '@/components/slot-add-menu';
import { OptimizePanel } from '@/components/optimize-panel';
import { MacroIcon } from '@/components/macro-icon';

type MealItem = {
  id: string;
  date: string;
  slot: MealSlot;
  kind: MealKind;
  recipe: {
    id: string;
    name: string;
    photoUrl?: string | null;
    prepTimeMinutes?: number | null;
    cookTimeMinutes?: number | null;
    ingredientCount?: number;
  } | null;
  portions: Array<{
    id: string;
    userId: string;
    portions: string;
    consumedAt: string | null;
    skipAutoConsume?: boolean;
    user: { displayName: string; email: string };
  }>;
  nutrition: {
    perServing: { kcal: number; protein: number; carbs: number; fat: number };
    complete: boolean;
  };
  manualIngredients?: Array<{
    id: string;
    quantity: number;
    unit: QuantityUnit;
    grams?: number | null;
    ingredient: { id: string; nameFr: string; iconUrl: string | null };
  }>;
  manualTitle?: string;
};

type Goal = {
  caloriesValue: string | null;
  proteinValue: string | null;
  carbsValue: string | null;
  fatValue: string | null;
};

type MacroTargets = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};
type Macros = { kcal: number; protein: number; carbs: number; fat: number };

function iso(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function weekRangeLabel(start: Date) {
  const end = addDays(start, 6);
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${format(start, 'd', { locale: fr })} – ${format(end, 'd MMMM', { locale: fr })}`;
  }
  return `${format(start, 'd MMMM', { locale: fr })} – ${format(end, 'd MMMM', { locale: fr })}`;
}

export default function PlanningPage() {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Math.min(6, Math.max(0, differenceInCalendarDays(new Date(), start)));
  });
  const [dialog, setDialog] = useState<{
    date: string;
    slot: MealSlot;
    replaceItemId?: string;
    recipeId?: string;
    replaceScope?: 'me' | 'all';
  } | null>(null);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [manualDialog, setManualDialog] = useState<{ date: string; slot: MealSlot } | null>(null);
  const [detail, setDetail] = useState<MealItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollSettleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const from = iso(weekStart);
  const todayIso = new Date().toISOString().slice(0, 10);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const mealsQuery = useQuery({
    queryKey: ['planner', from],
    queryFn: () => apiJson<MealItem[]>(`/api/bff/planner/week?from=${from}`),
  });
  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: () => apiJson<Goal | null>('/api/bff/nutrition-goals'),
  });
  const remove = useMutation({
    mutationFn: (input: { id: string; scope?: 'me' | 'all' }) =>
      apiJson(`/api/bff/planner/items/${input.id}${input.scope === 'me' ? '?scope=me' : ''}`, {
        method: 'DELETE',
      }),
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
          portions: users.map((u) => ({
            userId: u.id,
            portions: 1,
          })),
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
      apiJson<{ consumed: boolean }>('/api/bff/provisions/consumption', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['planner'] });
      void queryClient.invalidateQueries({ queryKey: ['pantry'] });
      void queryClient.invalidateQueries({ queryKey: ['shopping'] });
      void queryClient.invalidateQueries({ queryKey: ['provisions-summary'] });
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const selectedDate = days[selectedIndex] ?? days[0]!;

  useLayoutEffect(() => {
    if (mealsQuery.isLoading) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.querySelector<HTMLElement>(`[data-day-index="${String(selectedIndex)}"]`);
    if (!card) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const left =
      scroller.scrollLeft +
      (cardRect.left - scrollerRect.left) -
      (scroller.clientWidth - cardRect.width) / 2;
    scroller.scrollTo({ left: Math.max(0, left) });
  }, [selectedIndex, mealsQuery.isLoading, weekStart]);

  const selectCenteredDay = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !window.matchMedia('(max-width: 639px)').matches) return;

    if (scrollSettleRef.current) clearTimeout(scrollSettleRef.current);
    scrollSettleRef.current = setTimeout(() => {
      const scrollerCenter = scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
      const cards = Array.from(scroller.querySelectorAll<HTMLElement>('[data-day-index]'));
      let nearestIndex = selectedIndex;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - scrollerCenter);
        const index = Number(card.dataset.dayIndex);
        if (distance < nearestDistance && Number.isInteger(index)) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }

      setSelectedIndex(nearestIndex);
      scrollSettleRef.current = null;
    }, 140);
  }, [selectedIndex]);

  useEffect(
    () => () => {
      if (scrollSettleRef.current) clearTimeout(scrollSettleRef.current);
    },
    [],
  );
  const rawMeals = mealsQuery.data ?? [];
  const meals = user?.id ? mealsForEater(rawMeals, user.id) : rawMeals;

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

  const goals = goalsQuery.data;
  const weekAverages = weekMacroAverages({
    userId: user?.id ?? '',
    todayIso,
    meals: meals.map((item) => ({
      date: item.date,
      perServing: { ...item.nutrition.perServing, fiber: 0 },
      portions: item.portions.map((p) => ({
        userId: p.userId,
        portions: Number(p.portions),
        consumedAt: p.consumedAt,
        skipAutoConsume: p.skipAutoConsume,
      })),
    })),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <img
              src="/brand/panier-fruits.png"
              alt=""
              width={24}
              height={24}
              className="size-6 shrink-0 object-contain"
            />
            Bonjour {user?.displayName ?? ''}
          </span>
        }
        title="Planning"
        actionsBesideTitle
        actionsClassName="flex items-center justify-end gap-2"
        description={
          <div className="flex flex-wrap items-center gap-2 text-ink-900">
            <IconButton
              icon={ChevronLeft}
              label="Semaine précédente"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            />
            <span className="min-w-0 text-sm font-medium">{weekRangeLabel(weekStart)}</span>
            <IconButton
              icon={ChevronRight}
              label="Semaine suivante"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
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
          </div>
        }
        actions={
          <>
            <Button
              variant="glass"
              icon={Sparkles}
              className="hidden shrink-0 lg:inline-flex"
              onClick={() => setOptimizeOpen(true)}
            >
              Ajustement intelligent
            </Button>
            <IconButton
              icon={Sparkles}
              label="Ajustement intelligent"
              className="shrink-0 lg:hidden"
              onClick={() => setOptimizeOpen(true)}
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
          <p className="text-sm font-medium text-ink-900">Moyennes de la semaine</p>
          {goals ? null : <Badge tone="peach">Aucun objectif défini</Badge>}
        </div>
        <div className="grid grid-cols-4 gap-2 md:hidden">
          <MacroRing
            label="kcal"
            planned={weekAverages.planned.kcal}
            consumed={weekAverages.consumed.kcal}
            target={num(goals?.caloriesValue)}
            unit=""
            tone="peach"
            icon={<MacroIcon kind="kcal" />}
          />
          <MacroRing
            label="Protéines"
            planned={weekAverages.planned.protein}
            consumed={weekAverages.consumed.protein}
            target={num(goals?.proteinValue)}
            unit="g"
            tone="sage"
            icon={<MacroIcon kind="protein" />}
          />
          <MacroRing
            label="Glucides"
            planned={weekAverages.planned.carbs}
            consumed={weekAverages.consumed.carbs}
            target={num(goals?.carbsValue)}
            unit="g"
            tone="gold"
            icon={<MacroIcon kind="carbs" />}
          />
          <MacroRing
            label="Lipides"
            planned={weekAverages.planned.fat}
            consumed={weekAverages.consumed.fat}
            target={num(goals?.fatValue)}
            unit="g"
            tone="tomato"
            icon={<MacroIcon kind="fat" />}
          />
        </div>
        <div className="hidden md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-4">
          <Meter
            label="kcal"
            value={weekAverages.planned.kcal}
            consumed={weekAverages.consumed.kcal}
            target={num(goals?.caloriesValue)}
            unit=""
            tone="peach"
            icon={<MacroIcon kind="kcal" />}
          />
          <Meter
            label="Protéines"
            value={weekAverages.planned.protein}
            consumed={weekAverages.consumed.protein}
            target={num(goals?.proteinValue)}
            unit="g"
            tone="sage"
            icon={<MacroIcon kind="protein" />}
          />
          <Meter
            label="Glucides"
            value={weekAverages.planned.carbs}
            consumed={weekAverages.consumed.carbs}
            target={num(goals?.carbsValue)}
            unit="g"
            tone="gold"
            icon={<MacroIcon kind="carbs" />}
          />
          <Meter
            label="Lipides"
            value={weekAverages.planned.fat}
            consumed={weekAverages.consumed.fat}
            target={num(goals?.fatValue)}
            unit="g"
            tone="tomato"
            icon={<MacroIcon kind="fat" />}
          />
        </div>
      </Panel>

      {mealsQuery.isLoading ? (
        <div className="-mx-4 overflow-x-auto scroll-smooth px-4 py-3 sm:-mx-8 sm:px-8">
          <div className="flex w-max gap-3">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton
                key={i}
                className="h-[32rem] w-[calc(100vw-2rem)] shrink-0 rounded-2xl sm:w-[20rem]"
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={selectCenteredDay}
          className="-mx-4 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth px-4 py-3 sm:-mx-8 sm:snap-none sm:px-8"
        >
          <div className="flex w-max items-stretch gap-3">
            {days.map((day, index) => (
              <div
                key={iso(day)}
                data-day-index={index}
                className="shrink-0 snap-center snap-always"
              >
                <DayCard
                  date={day}
                  meals={meals}
                  userId={user?.id}
                  macros={macrosFor(day)}
                  selected={index === selectedIndex}
                  onSelect={() => setSelectedIndex(index)}
                  onAddRecipe={(slot) => setDialog({ date: iso(day), slot })}
                  onAddKind={(slot, kind) => {
                    if (kind === 'IMPOSED') setManualDialog({ date: iso(day), slot });
                    else addKind.mutate({ date: iso(day), slot, kind });
                  }}
                  onOpenItem={setDetail}
                  onChangeRecipe={(item, scope) =>
                    setDialog({
                      date: item.date.slice(0, 10),
                      slot: item.slot,
                      replaceItemId: item.id,
                      recipeId: item.recipe?.id,
                      replaceScope: scope,
                    })
                  }
                  onRemove={(id, scope) => remove.mutate({ id, scope })}
                  todayIso={todayIso}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <AddMealDialog
        open={dialog !== null}
        date={dialog?.date ?? iso(selectedDate)}
        slot={dialog?.slot ?? 'DINNER'}
        replaceItemId={dialog?.replaceItemId}
        replaceScope={dialog?.replaceScope}
        initialRecipeId={dialog?.recipeId}
        onClose={() => setDialog(null)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ['planner'] })}
      />
      <ManualMealDialog
        open={manualDialog !== null}
        date={manualDialog?.date ?? iso(selectedDate)}
        slot={manualDialog?.slot ?? 'DINNER'}
        onClose={() => setManualDialog(null)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ['planner'] })}
      />
      <PlannedMealModal
        item={detail}
        validated={
          detail
            ? isValidated(
                detail,
                detail.portions.find((p) => p.userId === user?.id),
                todayIso,
              )
            : false
        }
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
      <OptimizePanel
        open={optimizeOpen}
        date={iso(selectedDate)}
        weekFrom={from}
        onClose={() => setOptimizeOpen(false)}
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
  onChangeRecipe: (item: MealItem, scope?: 'me' | 'all') => void;
  onRemove: (id: string, scope?: 'me' | 'all') => void;
  todayIso: string;
}) {
  const key = iso(date);
  const today = isToday(date);

  return (
    <Card
      className={cn(
        'flex h-[32rem] w-[calc(100vw-2rem)] shrink-0 flex-col p-0 transition duration-300 ease-out-soft sm:w-[20rem]',
        selected && 'ring-2 ring-sage-300',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        className="flex w-full shrink-0 flex-col gap-1.5 rounded-t-2xl border-b border-white/70 px-4 py-3 text-left transition-colors duration-200 ease-out-soft enabled:hover:bg-white/50"
      >
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <span
            className={cn(
              'text-sm font-medium first-letter:uppercase',
              today ? 'text-sage-600' : 'text-ink-900',
            )}
          >
            {today ? 'Aujourd’hui' : format(date, 'EEEE d MMMM', { locale: fr })}
          </span>
        </span>
        <MacroCounts macros={macros} chips />
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 pt-2 pb-4">
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
  onChangeRecipe: (item: MealItem, scope?: 'me' | 'all') => void;
  onRemove: (id: string, scope?: 'me' | 'all') => void;
  todayIso: string;
}) {
  const chrome = SLOT_CHROME[slot];
  const label = MEAL_SLOT_LABELS[slot];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {items.length === 0 ? (
        <SlotAddMenu
          slot={slot}
          variant="empty"
          onChooseRecipe={onAddRecipe}
          onChooseKind={onAddKind}
        />
      ) : (
        <ul
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-1.5',
            items.length > 1 && 'overflow-y-auto',
          )}
        >
          {items.map((item) => {
            const portion = item.portions.find((p) => p.userId === userId);
            const qty = portion ? Number(portion.portions) : 0;
            const validated = isValidated(item, portion, todayIso);
            const past = item.date.slice(0, 10) < todayIso;
            const participants = item.portions.filter(
              (participant) => Number(participant.portions) > 0,
            );
            const kind = item.kind ?? 'RECIPE';
            const recipe = kind === 'RECIPE' ? item.recipe : null;
            const title =
              recipe?.name ??
              (kind === 'IMPOSED'
                ? (item.manualTitle ??
                  item.manualIngredients
                    ?.slice(0, 3)
                    .map((line) => line.ingredient.nameFr)
                    .join(' & ') ??
                  MEAL_KIND_LABELS[kind])
                : MEAL_KIND_LABELS[kind]);
            return (
              <li
                key={item.id}
                className={cn(
                  'group relative flex min-h-[5.75rem] flex-1 items-center overflow-hidden rounded-lg bg-white/75 py-3.5 pl-3.5 pr-2 shadow-[0_0_10px_rgba(28,25,23,0.08),0_2px_8px_rgba(28,25,23,0.08)]',
                  past
                    ? 'border border-ink-300/70 bg-ink-50/50 opacity-75 shadow-none'
                    : validated
                      ? 'border border-sage-500 border-l-[3px] border-l-sage-500'
                      : cn('border border-ink-200/70', chrome.rail),
                )}
              >
                <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenItem(item)}
                    aria-label={validated ? `${label}, ${title}, validé` : `${label}, ${title}`}
                    className="block min-w-0 rounded-lg pr-20 text-left"
                  >
                    <span className="block min-w-0">
                      <p className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">
                        {title}
                      </p>
                      {recipe ? (
                        <RecipeMeta recipe={recipe} kcal={item.nutrition.perServing.kcal * qty} />
                      ) : kind === 'IMPOSED' ? (
                        <p className="mt-2.5 flex items-center text-[11px] leading-none text-ink-400">
                          <MealCalories kcal={item.nutrition.perServing.kcal * qty} />
                        </p>
                      ) : null}
                    </span>
                  </button>
                  {(recipe || kind === 'IMPOSED') && !item.nutrition.complete ? (
                    <p className="flex items-center gap-1 pr-20 text-[11px] text-peach-500">
                      <UtensilsCrossed className="size-3 shrink-0" aria-hidden />
                      Incomplet
                    </p>
                  ) : null}
                </div>
                {participants.length > 0 ? (
                  <div
                    className="absolute right-2 bottom-2 flex -space-x-1.5"
                    role="group"
                    aria-label={`Repas de ${participants
                      .map((participant) => participant.user.displayName)
                      .join(' et ')}`}
                  >
                    {participants.map((participant) => (
                      <Avatar
                        key={participant.id}
                        name={participant.user.displayName}
                        src={avatarUrlForEmail(participant.user.email)}
                        className="size-6 rounded-full border-2 border-white text-[9px] shadow-sm"
                      />
                    ))}
                  </div>
                ) : null}
                <div className="absolute right-1.5 top-1.5 flex items-center">
                  <MealItemActions
                    title={title}
                    shared={participants.length >= 2}
                    onChange={(scope) => onChangeRecipe(item, scope)}
                    onRemove={(scope) => onRemove(item.id, scope)}
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

function MealItemActions({
  title,
  shared,
  onChange,
  onRemove,
}: {
  title: string;
  shared: boolean;
  onChange: (scope?: 'me' | 'all') => void;
  onRemove: (scope?: 'me' | 'all') => void;
}) {
  if (!shared) {
    return (
      <>
        <IconButton
          icon={RefreshCw}
          label={`Changer ${title}`}
          size="sm"
          variant="ghost"
          className="size-8 text-ink-400 hover:text-sage-600"
          onClick={() => onChange('all')}
        />
        <IconButton
          icon={Trash2}
          label={`Retirer ${title}`}
          size="sm"
          variant="ghost"
          className="size-8 text-ink-400 hover:text-tomato-500"
          onClick={() => onRemove('all')}
        />
      </>
    );
  }
  return (
    <>
      <ActionMenu icon={RefreshCw} label={`Changer ${title}`} hoverClass="hover:text-sage-600">
        <button
          type="button"
          className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm"
          onClick={() => onChange('all')}
        >
          Échanger pour tout le monde
        </button>
        <button
          type="button"
          className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm"
          onClick={() => onChange('me')}
        >
          Échanger pour moi seulement
        </button>
      </ActionMenu>
      <ActionMenu icon={Trash2} label={`Retirer ${title}`} hoverClass="hover:text-tomato-500">
        <button
          type="button"
          className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-tomato-500"
          onClick={() => onRemove('all')}
        >
          Supprimer pour tout le monde
        </button>
        <button
          type="button"
          className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-tomato-500"
          onClick={() => onRemove('me')}
        >
          Supprimer pour moi seulement
        </button>
      </ActionMenu>
    </>
  );
}

function ActionMenu({
  icon: Icon,
  label,
  hoverClass,
  children,
}: {
  icon: LucideIcon;
  label: string;
  hoverClass: string;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const width = 240;
    const viewportPad = 12;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
    const menuHeight = 96;
    const placeAbove = spaceBelow < menuHeight && rect.top - viewportPad > menuHeight;
    let left = rect.right - width;
    if (left < viewportPad) left = viewportPad;
    if (left + width > window.innerWidth - viewportPad) {
      left = window.innerWidth - viewportPad - width;
    }
    setPos({
      top: placeAbove ? undefined : rect.bottom + gap,
      bottom: placeAbove ? window.innerHeight - rect.top + gap : undefined,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-400 outline-none focus:outline-none focus-visible:outline-none',
          hoverClass,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed',
                top: pos.top,
                bottom: pos.bottom,
                left: pos.left,
                width: pos.width,
                zIndex: 70,
              }}
              className="rounded-xl border border-ink-200 bg-white p-1 shadow-lift outline-none [&_button]:outline-none [&_button]:focus-visible:outline-none [&_button]:focus-visible:bg-ink-100"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function RecipeMeta({ recipe, kcal }: { recipe: NonNullable<MealItem['recipe']>; kcal: number }) {
  const ingredientCount = recipe.ingredientCount ?? 0;
  const prep = recipe.prepTimeMinutes;
  const cook = recipe.cookTimeMinutes;
  return (
    <p className="mt-2.5 flex flex-nowrap items-center gap-2.5 overflow-hidden whitespace-nowrap text-[11px] leading-none text-ink-400">
      {ingredientCount > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap">
          <Carrot className="size-3 shrink-0" aria-hidden />
          <span className="tabular">{ingredientCount}</span>
        </span>
      ) : null}
      {prep != null && prep > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap">
          <Clock className="size-3 shrink-0" aria-hidden />
          <span className="tabular">{prep} min</span>
        </span>
      ) : null}
      {cook != null && cook > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap">
          <CookingPot className="size-3 shrink-0" aria-hidden />
          <span className="tabular">{cook} min</span>
        </span>
      ) : null}
      <MealCalories kcal={kcal} />
    </p>
  );
}

function MealCalories({ kcal }: { kcal: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-peach-500">
      <MacroIcon kind="kcal" className="size-3 shrink-0" />
      <span className="tabular">{Math.round(kcal)} kcal</span>
    </span>
  );
}

const MACRO_LINE = [
  { key: 'kcal', suffix: 'kcal', className: 'text-peach-500' },
  { key: 'protein', suffix: 'P', className: 'text-sage-600' },
  { key: 'carbs', suffix: 'G', className: 'text-ink-800' },
  { key: 'fat', suffix: 'L', className: 'text-tomato-500' },
] as const;

function MacroCounts({
  macros,
  targets,
  className,
  chips = false,
}: {
  macros: Macros;
  targets?: MacroTargets;
  className?: string;
  chips?: boolean;
}) {
  const [asPercent, setAsPercent] = useState(false);
  const canToggle = Boolean(
    targets && (targets.kcal || targets.protein || targets.carbs || targets.fat),
  );
  const showPercent = canToggle && asPercent;

  const body = MACRO_LINE.map((item) => {
    const target = targets?.[item.key] ?? null;
    const percent = target && target > 0 ? Math.round((macros[item.key] / target) * 100) : null;
    return (
      <span
        key={item.key}
        className={cn(
          'flex min-w-0 items-center gap-1 whitespace-nowrap font-bold',
          item.className,
          chips &&
            'justify-center rounded-full border border-white/90 bg-white/80 px-1.5 py-1.5 shadow-sm',
        )}
      >
        <MacroIcon kind={item.key} className="size-3 shrink-0" />
        <span className="tabular">
          {showPercent ? (
            percent === null ? (
              '—'
            ) : (
              `${String(percent)} %`
            )
          ) : (
            <>
              {Math.round(macros[item.key])}
              {item.suffix === 'kcal' ? ' kcal' : ` ${item.suffix}`}
            </>
          )}
        </span>
      </span>
    );
  });

  const classes = cn(
    'tabular grid w-full items-center text-[11px] leading-none',
    chips
      ? 'grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))] gap-1.5'
      : 'grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(0,1fr))] gap-x-2.5',
    canToggle ? 'cursor-pointer rounded-md text-left' : null,
    className,
  );

  if (canToggle) {
    return (
      <button
        type="button"
        className={classes}
        aria-pressed={asPercent}
        aria-label={
          asPercent ? 'Afficher les quantités' : 'Afficher le pourcentage de l’objectif du jour'
        }
        onClick={() => setAsPercent((current) => !current)}
      >
        {body}
      </button>
    );
  }

  return <p className={classes}>{body}</p>;
}
