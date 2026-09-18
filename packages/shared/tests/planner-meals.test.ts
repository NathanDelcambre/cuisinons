import { describe, expect, it } from 'vitest';
import { mealsForEater } from '../src/planner/slots.js';

describe('mealsForEater', () => {
  const jade = 'jade';
  const nathan = 'nathan';

  it('n’affiche pas le repas de l’autre sur le même créneau', () => {
    const items = [
      {
        id: 'jade-lunch',
        date: '2026-09-18',
        slot: 'LUNCH',
        portions: [
          { userId: jade, portions: 1 },
          { userId: nathan, portions: 0 },
        ],
      },
      {
        id: 'nathan-lunch',
        date: '2026-09-18',
        slot: 'LUNCH',
        portions: [
          { userId: jade, portions: 0 },
          { userId: nathan, portions: 1 },
        ],
      },
    ];
    expect(mealsForEater(items, nathan).map((item) => item.id)).toEqual(['nathan-lunch']);
    expect(mealsForEater(items, jade).map((item) => item.id)).toEqual(['jade-lunch']);
  });

  it('garde le repas partagé', () => {
    const items = [
      {
        id: 'shared',
        date: '2026-09-18',
        slot: 'DINNER',
        portions: [
          { userId: jade, portions: 1 },
          { userId: nathan, portions: 1.5 },
        ],
      },
    ];
    expect(mealsForEater(items, nathan).map((item) => item.id)).toEqual(['shared']);
  });

  it('ne garde qu’un repas si le même convive en a deux', () => {
    const items = [
      {
        id: 'old',
        date: '2026-09-18',
        slot: 'DINNER',
        portions: [{ userId: nathan, portions: 1 }],
      },
      {
        id: 'new',
        date: '2026-09-18',
        slot: 'DINNER',
        portions: [{ userId: nathan, portions: 1 }],
      },
    ];
    expect(mealsForEater(items, nathan).map((item) => item.id)).toEqual(['new']);
  });
});
