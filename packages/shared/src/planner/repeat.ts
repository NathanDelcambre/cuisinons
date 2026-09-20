/** Lundi → dimanche, comme `Date#getUTCDay` (0 = dimanche). */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_LABELS: Record<(typeof WEEKDAY_ORDER)[number], { short: string; name: string }> = {
  1: { short: 'L', name: 'Lundi' },
  2: { short: 'M', name: 'Mardi' },
  3: { short: 'M', name: 'Mercredi' },
  4: { short: 'J', name: 'Jeudi' },
  5: { short: 'V', name: 'Vendredi' },
  6: { short: 'S', name: 'Samedi' },
  0: { short: 'D', name: 'Dimanche' },
};

export type MealRepeatUntil = 'week' | 'following';

function utcDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function endOfWeekIso(startIso: string): string {
  const start = utcDate(startIso);
  const day = start.getUTCDay();
  const add = day === 0 ? 0 : 7 - day;
  start.setUTCDate(start.getUTCDate() + add);
  return toIso(start);
}

/** Dates du créneau répété, sans revenir avant le jour choisi ni dépasser la limite. */
export function mealRepeatDates(input: {
  startIso: string;
  weekdays: readonly number[];
  until: MealRepeatUntil;
  maxIso: string;
}): string[] {
  const wanted = new Set(input.weekdays.filter((day) => day >= 0 && day <= 6));
  if (wanted.size === 0) return [];
  const start = utcDate(input.startIso);
  const max = utcDate(input.maxIso);
  if (start.getTime() > max.getTime()) return [];
  const endIso = input.until === 'week' ? endOfWeekIso(input.startIso) : input.maxIso;
  const end = utcDate(endIso).getTime() > max.getTime() ? max : utcDate(endIso);
  const dates: string[] = [];
  for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (wanted.has(cursor.getUTCDay())) dates.push(toIso(cursor));
  }
  return dates;
}
