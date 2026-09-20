import { describe, expect, it } from 'vitest';
import { mealRepeatDates } from '../src/planner/repeat.js';

describe('mealRepeatDates', () => {
  it('remplit le reste de la semaine, sans les jours déjà passés', () => {
    expect(
      mealRepeatDates({
        startIso: '2026-09-24',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        until: 'week',
        maxIso: '2027-09-24',
      }),
    ).toEqual(['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']);
  });

  it('répète les jours choisis sur les semaines suivantes', () => {
    expect(
      mealRepeatDates({
        startIso: '2026-09-21',
        weekdays: [1, 4],
        until: 'following',
        maxIso: '2026-10-02',
      }),
    ).toEqual(['2026-09-21', '2026-09-24', '2026-09-28', '2026-10-01']);
  });

  it('ne prend que les jours choisis jusqu’au dimanche', () => {
    expect(
      mealRepeatDates({
        startIso: '2026-09-21',
        weekdays: [1, 4],
        until: 'week',
        maxIso: '2027-09-21',
      }),
    ).toEqual(['2026-09-21', '2026-09-24']);
  });

  it('reste vide si le jour de départ dépasse la limite', () => {
    expect(
      mealRepeatDates({
        startIso: '2027-01-01',
        weekdays: [1],
        until: 'week',
        maxIso: '2026-12-01',
      }),
    ).toEqual([]);
  });
});
