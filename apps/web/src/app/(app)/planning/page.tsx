'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, differenceInCalendarDays, format, isToday, startOfWeek } from 'date-fns';
import { motion } from 'motion/react';
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
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3,
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
  Button,
  Card,
  Field,
  IconButton,
  Input,
  MacroRing,
  Modal,
  Skeleton,
  cn,
  transitions,
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
import { RecipeCover } from '@/components/recipe-cover';
import { SlotAddMenu, type SpecialMealKind } from '@/components/slot-add-menu';
import { OptimizePanel } from '@/components/optimize-panel';
import { MacroIcon } from '@/components/macro-icon';
import { specialMealCover } from '@/components/meal-covers';

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
  estimatedKcal?: number | null;
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

type HouseholdUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

function iso(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

/** Largeur confortable, qui s'élargit dès que l'écran peut montrer environ cinq jours. */
const DAY_CARD_FRAME =
  'h-full min-h-[32rem] w-[calc(100vw-2rem)] shrink-0 sm:w-[20rem] xl:w-[max(20rem,calc((100vw-18.5rem)/5))]';

/**
 * Glisser horizontalement la bande des jours, sans voler les clics :
 * un mouvement de souris trop court reste un clic sur le repas ou le bouton.
 */
function useDayStripDrag(scrollerRef: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !enabled) return;

    let pointerId = -1;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = scroller.scrollLeft;
      moved = false;
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) {
        moved = true;
        setDragging(true);
        window.getSelection()?.removeAllRanges();
      }
      scroller.scrollLeft = startScroll - dx;
    };
    const end = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = -1;
      setDragging(false);
    };
    const onClick = (event: MouseEvent) => {
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    };

    scroller.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('click', onClick, true);
    return () => {
      scroller.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('click', onClick, true);
    };
  }, [scrollerRef, enabled]);

  return dragging;
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
    targetUserId?: string;
    initialPortions?: Record<string, number>;
    soloUserId?: string;
  } | null>(null);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [averagesOpen, setAveragesOpen] = useState(false);
  const [manualDialog, setManualDialog] = useState<{
    date: string;
    slot: MealSlot;
    soloUserId?: string;
    initialLines?: Array<{
      ingredient: { id: string; nameFr: string; iconUrl: string | null };
      quantity: number;
      unit: QuantityUnit;
    }>;
    initialPortions?: Record<string, number>;
  } | null>(null);
  const [skipDialog, setSkipDialog] = useState<{ date: string; slot: MealSlot } | null>(null);
  const [restaurantDialog, setRestaurantDialog] = useState<{
    date: string;
    slot: MealSlot;
    scope?: 'me';
    subjectId?: string;
  } | null>(null);
  const [restaurantKcal, setRestaurantKcal] = useState('');
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
  const draggingDays = useDayStripDrag(scrollerRef, !mealsQuery.isLoading);
  const household = useQuery({
    queryKey: ['users'],
    queryFn: () => apiJson<HouseholdUser[]>('/api/bff/users'),
  });
  const subjectId = viewUserId ?? user?.id;
  const subject = household.data?.find((member) => member.id === subjectId);
  const isSelf = !subjectId || subjectId === user?.id;
  const subjectLabel = isSelf ? 'moi' : (subject?.displayName ?? 'l’autre');
  const goalsQuery = useQuery({
    queryKey: ['goals', subjectId],
    queryFn: () =>
      apiJson<Goal | null>(`/api/bff/nutrition-goals?userId=${encodeURIComponent(subjectId!)}`),
    enabled: Boolean(subjectId),
  });
  const remove = useMutation({
    mutationFn: (input: { id: string; scope?: 'me' | 'all'; userId?: string }) => {
      const params = new URLSearchParams();
      if (input.scope === 'me') params.set('scope', 'me');
      if (input.userId) params.set('userId', input.userId);
      const query = params.toString();
      return apiJson(`/api/bff/planner/items/${input.id}${query ? `?${query}` : ''}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planner'] }),
  });

  const addKind = useMutation({
    mutationFn: async (input: {
      date: string;
      slot: MealSlot;
      kind: SpecialMealKind;
      scope?: 'me' | 'all';
      subjectId?: string;
      estimatedKcal?: number;
    }) => {
      const users = await apiJson<Array<{ id: string }>>('/api/bff/users');
      const onlyId = input.scope === 'me' ? (input.subjectId ?? user?.id) : undefined;
      const portions = users.map((u) => ({
        userId: u.id,
        portions: onlyId && u.id !== onlyId ? 0 : 1,
      }));
      if (!portions.some((line) => line.portions > 0) && portions[0]) portions[0].portions = 1;
      return apiJson('/api/bff/planner/items', {
        method: 'POST',
        body: JSON.stringify({
          date: input.date,
          slot: input.slot,
          kind: input.kind,
          portions,
          ...(input.estimatedKcal === undefined ? {} : { estimatedKcal: input.estimatedKcal }),
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
  const meals = subjectId ? mealsForEater(rawMeals, subjectId) : rawMeals;

  function macrosFor(date: Date): Macros {
    const key = iso(date);
    const acc: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const item of meals.filter((m) => m.date.slice(0, 10) === key)) {
      const portion = item.portions.find((p) => p.userId === subjectId);
      const qty = portion ? Number(portion.portions) : 0;
      acc.kcal += item.nutrition.perServing.kcal * qty;
      acc.protein += item.nutrition.perServing.protein * qty;
      acc.carbs += item.nutrition.perServing.carbs * qty;
      acc.fat += item.nutrition.perServing.fat * qty;
    }
    return acc;
  }

  const goals = goalsQuery.data;
  const restaurantEstimate = Number(restaurantKcal.replace(',', '.'));
  const restaurantEstimateValid =
    restaurantKcal.trim() !== '' &&
    Number.isInteger(restaurantEstimate) &&
    restaurantEstimate >= 0 &&
    restaurantEstimate <= 8000;
  const weekAverages = weekMacroAverages({
    userId: subjectId ?? '',
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
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col gap-6 lg:min-h-[calc(100dvh-6rem)]">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
        <h1 className="shrink-0 font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-ink-900 sm:text-[2rem]">
          Planning de {subject?.displayName ?? user?.displayName ?? '…'}
        </h1>
        <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-2 text-ink-900 sm:w-auto sm:justify-start">
          <IconButton
            icon={ChevronLeft}
            label="Semaine précédente"
            size="sm"
            variant="ghost"
            className="size-7 text-ink-400 hover:text-ink-600"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          />
          <span className="min-w-0 text-sm font-medium">{weekRangeLabel(weekStart)}</span>
          <IconButton
            icon={ChevronRight}
            label="Semaine suivante"
            size="sm"
            variant="ghost"
            className="size-7 text-ink-400 hover:text-ink-600"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          />
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          {household.data && household.data.length > 1 ? (
            <PersonSwitch people={household.data} selectedId={subjectId} onChange={setViewUserId} />
          ) : null}
          <IconButton
            icon={Sparkles}
            label="Ajustement intelligent"
            size="sm"
            className="shrink-0 border-white bg-white text-ink-800 shadow-soft"
            onClick={() => setOptimizeOpen(true)}
          />
          <IconButton
            icon={BarChart3}
            label="Moyennes de la semaine"
            size="sm"
            className="shrink-0 border-white bg-white text-ink-800 shadow-soft"
            onClick={() => setAveragesOpen(true)}
          />
        </div>
      </header>

      {notice ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <p className="text-sm text-ink-600">{notice}</p>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
            Fermer
          </Button>
        </Card>
      ) : null}

      {mealsQuery.isLoading ? (
        <div className="scrollbar-none -mx-4 min-h-0 flex-1 overflow-x-auto px-4 py-3 sm:-mx-8 sm:px-8">
          <div className="flex h-full w-max gap-3">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className={cn(DAY_CARD_FRAME, 'rounded-2xl')} />
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={selectCenteredDay}
          className={cn(
            'scrollbar-none -mx-4 min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-4 py-3 sm:-mx-8 sm:snap-none sm:px-8 [&_button]:cursor-pointer',
            draggingDays ? 'cursor-grabbing select-none' : 'cursor-grab',
          )}
        >
          <div className="flex h-full w-max items-stretch gap-3">
            {days.map((day, index) => (
              <div
                key={iso(day)}
                data-day-index={index}
                className="h-full shrink-0 snap-center snap-always"
              >
                <DayCard
                  date={day}
                  meals={meals}
                  userId={subjectId}
                  selfLabel={subjectLabel}
                  macros={macrosFor(day)}
                  onSelect={() => setSelectedIndex(index)}
                  onAddRecipe={(slot) =>
                    setDialog({
                      date: iso(day),
                      slot,
                      soloUserId: isSelf ? undefined : subjectId,
                    })
                  }
                  onAddKind={(slot, kind) => {
                    if (kind === 'IMPOSED')
                      setManualDialog({
                        date: iso(day),
                        slot,
                        soloUserId: isSelf ? undefined : subjectId,
                      });
                    else if (kind === 'SKIPPED') setSkipDialog({ date: iso(day), slot });
                    else {
                      setRestaurantKcal('');
                      setRestaurantDialog({
                        date: iso(day),
                        slot,
                        scope: isSelf ? undefined : 'me',
                        subjectId,
                      });
                    }
                  }}
                  onOpenItem={setDetail}
                  onChangeRecipe={(item, scope) =>
                    setDialog({
                      date: item.date.slice(0, 10),
                      slot: item.slot,
                      replaceItemId: item.id,
                      recipeId: item.recipe?.id,
                      replaceScope: scope,
                      targetUserId: scope === 'me' ? subjectId : undefined,
                      initialPortions: Object.fromEntries(
                        item.portions.map((portion) => [portion.userId, Number(portion.portions)]),
                      ),
                    })
                  }
                  onRemove={(id, scope) =>
                    remove.mutate({
                      id,
                      scope,
                      userId: scope === 'me' ? subjectId : undefined,
                    })
                  }
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
        targetUserId={dialog?.targetUserId}
        initialPortions={dialog?.initialPortions}
        soloUserId={dialog?.soloUserId}
        initialRecipeId={dialog?.recipeId}
        onClose={() => setDialog(null)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ['planner'] })}
      />
      <Modal
        open={skipDialog !== null}
        title="Repas sauté"
        description="Qui saute ce repas ?"
        onClose={() => setSkipDialog(null)}
        footer={
          <>
            <Button
              variant="ghost"
              loading={addKind.isPending}
              onClick={() => {
                if (!skipDialog) return;
                addKind.mutate(
                  { ...skipDialog, kind: 'SKIPPED', scope: 'me', subjectId },
                  { onSuccess: () => setSkipDialog(null) },
                );
              }}
            >
              {isSelf ? 'Pour moi seulement' : `Pour ${subjectLabel} seulement`}
            </Button>
            <Button
              loading={addKind.isPending}
              onClick={() => {
                if (!skipDialog) return;
                addKind.mutate(
                  { ...skipDialog, kind: 'SKIPPED', scope: 'all' },
                  { onSuccess: () => setSkipDialog(null) },
                );
              }}
            >
              Pour tout le monde
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">
          Le créneau reste vide pour les personnes qui ne sautent pas le repas.
        </p>
      </Modal>
      <Modal
        open={restaurantDialog !== null}
        title="Restaurant"
        description="À peu près combien de calories ?"
        onClose={() => setRestaurantDialog(null)}
        footer={
          <>
            <Button
              variant="ghost"
              loading={addKind.isPending}
              disabled={restaurantEstimateValid ? undefined : true}
              onClick={() => {
                if (!restaurantDialog || !restaurantEstimateValid) return;
                addKind.mutate(
                  {
                    date: restaurantDialog.date,
                    slot: restaurantDialog.slot,
                    kind: 'RESTAURANT',
                    estimatedKcal: restaurantEstimate,
                    scope: 'me',
                    subjectId,
                  },
                  { onSuccess: () => setRestaurantDialog(null) },
                );
              }}
            >
              {isSelf ? 'Pour moi seulement' : `Pour ${subjectLabel} seulement`}
            </Button>
            <Button
              loading={addKind.isPending}
              disabled={restaurantEstimateValid ? undefined : true}
              onClick={() => {
                if (!restaurantDialog || !restaurantEstimateValid) return;
                addKind.mutate(
                  {
                    date: restaurantDialog.date,
                    slot: restaurantDialog.slot,
                    kind: 'RESTAURANT',
                    estimatedKcal: restaurantEstimate,
                    scope: 'all',
                  },
                  { onSuccess: () => setRestaurantDialog(null) },
                );
              }}
            >
              Pour tout le monde
            </Button>
          </>
        }
      >
        <Field label="Calories" hint="Une estimation suffit.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              inputMode="numeric"
              placeholder="650"
              suffix="kcal"
              value={restaurantKcal}
              onChange={(event) => setRestaurantKcal(event.target.value)}
            />
          )}
        </Field>
      </Modal>
      <ManualMealDialog
        open={manualDialog !== null}
        date={manualDialog?.date ?? iso(selectedDate)}
        slot={manualDialog?.slot ?? 'DINNER'}
        soloUserId={manualDialog?.soloUserId}
        initialLines={manualDialog?.initialLines}
        initialPortions={manualDialog?.initialPortions}
        onClose={() => setManualDialog(null)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ['planner'] })}
      />
      <PlannedMealModal
        item={detail}
        validated={
          detail
            ? isValidated(
                detail,
                detail.portions.find((portion) => portion.userId === subjectId),
                todayIso,
              )
            : false
        }
        loading={consume.isPending}
        onClose={() => setDetail(null)}
        onCancelValidation={() => {
          const portion = detail?.portions.find((item) => item.userId === subjectId);
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
            replaceScope: 'all',
            initialPortions: Object.fromEntries(
              detail.portions.map((portion) => [portion.userId, Number(portion.portions)]),
            ),
          });
          setDetail(null);
        }}
        onEdit={() => {
          if (!detail) return;
          if (detail.kind === 'RESTAURANT') {
            setRestaurantKcal(
              detail.estimatedKcal != null ? String(Math.round(detail.estimatedKcal)) : '',
            );
            setRestaurantDialog({
              date: detail.date.slice(0, 10),
              slot: detail.slot,
              subjectId,
            });
            setDetail(null);
            return;
          }
          if (detail.kind === 'IMPOSED') {
            setManualDialog({
              date: detail.date.slice(0, 10),
              slot: detail.slot,
              initialLines: (detail.manualIngredients ?? []).map((line) => ({
                ingredient: {
                  id: line.ingredient.id,
                  nameFr: line.ingredient.nameFr,
                  iconUrl: line.ingredient.iconUrl,
                },
                quantity: line.quantity,
                unit: line.unit,
              })),
              initialPortions: Object.fromEntries(
                detail.portions.map((portion) => [portion.userId, Number(portion.portions)]),
              ),
            });
            setDetail(null);
          }
        }}
      />
      <Modal
        open={averagesOpen}
        title="Moyennes de la semaine"
        description={
          isSelf
            ? 'Moyenne par jour, pour toi.'
            : `Moyenne par jour, pour ${subject?.displayName ?? 'l’autre'}.`
        }
        onClose={() => setAveragesOpen(false)}
      >
        <div className="grid grid-cols-4 gap-2">
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
      </Modal>
      <OptimizePanel
        open={optimizeOpen}
        date={iso(selectedDate)}
        weekFrom={from}
        people={household.data ?? []}
        selfId={user?.id}
        subjectId={subjectId}
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
  if (!portion || Number(portion.portions) <= 0) return false;
  if (portion.consumedAt) return true;
  if (portion.skipAutoConsume) return false;
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
  selfLabel,
  macros,
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
  selfLabel: string;
  macros: Macros;
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
    <div
      className={cn(
        DAY_CARD_FRAME,
        'relative flex flex-col overflow-hidden rounded-2xl border-0 bg-[#fffdfb] p-0 shadow-[0_16px_36px_-12px_rgba(28,25,23,0.28)]',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        className={cn(
          'flex w-full shrink-0 cursor-pointer flex-col gap-1.5 rounded-t-2xl bg-[#6e665e] px-4 py-3 text-left text-[#fffaf6] transition-colors duration-200 ease-out-soft enabled:hover:bg-[#625c54]',
        )}
      >
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <span
            className={cn(
              'text-sm font-medium first-letter:uppercase',
              today ? 'text-sage-100' : 'text-[#fffaf6]',
            )}
          >
            {today ? 'Aujourd’hui' : format(date, 'EEEE d MMMM', { locale: fr })}
          </span>
        </span>
        <MacroCounts macros={macros} />
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pt-3 pb-4">
        {MEAL_SLOTS.map((slot) => (
          <SlotSection
            key={slot}
            slot={slot}
            items={meals.filter((m) => m.date.slice(0, 10) === key && m.slot === slot)}
            userId={userId}
            selfLabel={selfLabel}
            onAddRecipe={() => onAddRecipe(slot)}
            onAddKind={(kind) => onAddKind(slot, kind)}
            onOpenItem={onOpenItem}
            onChangeRecipe={onChangeRecipe}
            onRemove={onRemove}
            todayIso={todayIso}
          />
        ))}
      </div>
    </div>
  );
}

function SlotSection({
  slot,
  items,
  userId,
  selfLabel,
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
  selfLabel: string;
  onAddRecipe: () => void;
  onAddKind: (kind: SpecialMealKind) => void;
  onOpenItem: (item: MealItem) => void;
  onChangeRecipe: (item: MealItem, scope?: 'me' | 'all') => void;
  onRemove: (id: string, scope?: 'me' | 'all') => void;
  todayIso: string;
}) {
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
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5">
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
            const cover = recipe?.photoUrl ?? specialMealCover(kind, slot);
            return (
              <li
                key={item.id}
                className={cn(
                  'group relative flex min-h-[5.75rem] flex-1 items-center overflow-hidden rounded-lg bg-[#f6f2ec] py-3.5 pl-3.5 pr-2',
                  past && 'bg-[#efeae3] opacity-75',
                )}
              >
                {cover ? (
                  <RecipeCover
                    src={cover}
                    className="mr-2.5 size-12 aspect-square rounded-lg object-cover"
                  />
                ) : null}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenItem(item)}
                    aria-label={validated ? `${label}, ${title}, validé` : `${label}, ${title}`}
                    className="block min-w-0 rounded-lg text-left"
                  >
                    <span className="block min-w-0">
                      <p className="line-clamp-2 pr-16 text-sm font-medium leading-snug text-ink-900">
                        {title}
                      </p>
                      {recipe ? (
                        <RecipeMeta recipe={recipe} kcal={item.nutrition.perServing.kcal * qty} />
                      ) : kind === 'IMPOSED' ||
                        (kind === 'RESTAURANT' && item.estimatedKcal != null) ? (
                        <p className="mt-2.5 flex items-center pr-12 text-[11px] leading-none text-ink-400">
                          <MealCalories kcal={item.nutrition.perServing.kcal * qty} />
                        </p>
                      ) : null}
                    </span>
                  </button>
                  {(recipe || kind === 'IMPOSED') && !item.nutrition.complete ? (
                    <p className="flex items-center gap-1 pr-12 text-[11px] text-peach-500">
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
                <div className="absolute right-1.5 top-1.5 flex items-center opacity-45 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                  <MealItemActions
                    title={title}
                    shared={participants.length >= 2}
                    selfLabel={selfLabel}
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
  selfLabel,
  onChange,
  onRemove,
}: {
  title: string;
  shared: boolean;
  selfLabel: string;
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
          Échanger pour {selfLabel} seulement
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
          Supprimer pour {selfLabel} seulement
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
    <p className="mt-2.5 flex flex-nowrap items-center gap-1.5 overflow-hidden whitespace-nowrap pr-12 text-[11px] leading-none text-ink-400">
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
  { key: 'kcal', suffix: 'kcal', className: 'text-peach-200' },
  { key: 'protein', suffix: 'P', className: 'text-sage-200' },
  { key: 'carbs', suffix: 'G', className: 'text-ink-100' },
  { key: 'fat', suffix: 'L', className: 'text-tomato-100' },
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
        <MacroIcon kind={item.key} className={cn('size-3 shrink-0', item.className)} />
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

function PersonSwitch({
  people,
  selectedId,
  onChange,
  className,
}: {
  people: HouseholdUser[];
  selectedId?: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Planning"
      className={cn('segmented-track inline-flex rounded-full p-[3px]', className)}
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
              'relative flex min-h-9 items-center gap-1.5 rounded-full py-0.5 pl-1 pr-3 text-[13px] font-medium transition-colors duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
              active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {active ? (
              <motion.span
                layoutId="planning-person"
                transition={transitions.spring}
                className="segmented-thumb absolute inset-0 rounded-full"
              />
            ) : null}
            <Avatar
              name={person.displayName}
              src={person.avatarUrl}
              className={cn(
                'relative size-6 rounded-full text-[10px] transition-opacity duration-200 ease-out-soft',
                active ? 'opacity-100' : 'opacity-70',
              )}
            />
            <span className="relative">{person.displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
