'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronLeft, Star } from 'lucide-react';
import { MEAL_SLOT_LABELS, type MealSlot } from '@cuisinons/shared';
import { Card, PageHeader, Segmented, Skeleton } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { routes } from '@/lib/routes';
import { Avatar } from '@/components/avatar';
import { MacroIcon, type MacroKey } from '@/components/macro-icon';

const MACROS: Array<{ key: MacroKey; label: string; unit: string }> = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protéines', unit: 'g.' },
  { key: 'carbs', label: 'Glucides', unit: 'g.' },
  { key: 'fat', label: 'Lipides', unit: 'g.' },
];

type StatsResponse = {
  period: string;
  users: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    plannedDaily: { kcal: number; protein: number; carbs: number; fat: number };
    consumedDaily: { kcal: number; protein: number; carbs: number; fat: number };
    favorites: Array<{ slot: MealSlot; recipeName: string | null; count: number }>;
  }>;
};

export default function StatsPage() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const stats = useQuery({
    queryKey: ['nutrition-stats', period],
    queryFn: () => apiJson<StatsResponse>(`/api/bff/nutrition/stats?period=${period}`),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={routes.profil}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors duration-200 ease-out-soft hover:text-ink-900"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Profil
      </Link>

      <PageHeader
        title="Statistiques"
        description="Apports prévus et consommés, et les plats que tu fais le plus souvent."
      />

      <Segmented
        label="Période"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'day', label: 'Jour' },
          { value: 'week', label: 'Semaine' },
          { value: 'month', label: 'Mois' },
          { value: 'year', label: 'Année' },
        ]}
      />

      {stats.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : !stats.data || stats.data.users.every((person) => person.plannedDaily.kcal === 0) ? (
        <Card>
          <p className="text-sm text-ink-500">Pas encore de repas sur cette période.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stats.data.users.map((person) => (
            <Card key={person.userId} className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Avatar
                  name={person.displayName}
                  src={person.avatarUrl}
                  className="size-9 rounded-full text-xs"
                />
                <p className="font-medium text-ink-900">{person.displayName}</p>
              </div>
              <ul className="space-y-1.5 text-sm">
                {MACROS.map((macro) => (
                  <li key={macro.key} className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-ink-500">
                      <MacroIcon kind={macro.key} />
                      {macro.label}
                    </span>
                    <span className="tabular text-ink-900">
                      {Math.round(person.consumedDaily[macro.key])}/{Math.round(person.plannedDaily[macro.key])}{' '}
                      {macro.unit}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 border-t border-white/70 pt-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
                  <Star className="size-3.5 fill-peach-400 text-peach-400" aria-hidden />
                  Favoris
                </p>
                {person.favorites.map((fav) => (
                  <p key={fav.slot} className="text-sm text-ink-600">
                    {MEAL_SLOT_LABELS[fav.slot]} : {fav.recipeName ?? '—'}
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
