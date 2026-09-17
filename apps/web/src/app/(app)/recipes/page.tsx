'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ChefHat, Flame, Plus, Star } from 'lucide-react';
import {
  Badge,
  CardLink,
  EmptyState,
  PageHeader,
  Segmented,
  Select,
  SearchInput,
  Skeleton,
  buttonClasses,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';

type Recipe = {
  id: string;
  name: string;
  author: { displayName: string };
  nutrition: { perServing: { kcal: number; protein: number; carbs: number; fat: number } };
  rating: { average: number | null; count: number };
  tags: Array<{ tag: { slug: string; label: string } }>;
};

const SORTS = [
  { value: 'date', label: 'Plus récentes' },
  { value: 'name', label: 'Nom' },
  { value: 'rating-desc', label: 'Mieux notées' },
  { value: 'rating-asc', label: 'Moins notées' },
  { value: 'protein-desc', label: 'Plus de protéines' },
  { value: 'protein-asc', label: 'Moins de protéines' },
  { value: 'carbs-desc', label: 'Plus de glucides' },
  { value: 'carbs-asc', label: 'Moins de glucides' },
  { value: 'kcal-desc', label: 'Plus de calories' },
  { value: 'kcal-asc', label: 'Moins de calories' },
];

const BASIS = [
  { value: 'serving', label: 'Par portion' },
  { value: '100g', label: 'Pour 100 g' },
] as const;

function RecipesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = params.get('sort') ?? 'date';
  const basis = (params.get('basis') as 'serving' | '100g') ?? 'serving';
  const [draft, setDraft] = useState(q);

  // L'URL reste la source de verite : un retour arriere doit remettre le champ
  // de recherche dans l'etat correspondant.
  useEffect(() => setDraft(q), [q]);

  const recipes = useQuery({
    queryKey: ['recipes', q, tag, sort, basis],
    queryFn: () =>
      apiJson<Recipe[]>(
        `/api/bff/recipes?q=${encodeURIComponent(q)}&tag=${encodeURIComponent(tag)}&sort=${sort}&basis=${basis}`,
      ),
  });
  const tags = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiJson<Array<{ slug: string; label: string }>>('/api/bff/tags'),
  });

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    router.replace(`/recipes?${sp.toString()}`);
  }

  const list = recipes.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={list.length > 0 ? `${String(list.length)} recette${list.length > 1 ? 's' : ''}` : undefined}
        title="Recettes"
        actions={
          <Link href="/recipes/new" className={buttonClasses()}>
            <Plus className="size-4" aria-hidden />
            Nouvelle recette
          </Link>
        }
      />

      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: draft });
        }}
      >
        <SearchInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Rechercher une recette"
          aria-label="Rechercher une recette"
          className="min-w-56 flex-1"
        />
        <Select
          value={tag}
          aria-label="Filtrer par tag"
          className="w-auto"
          onChange={(e) => update({ tag: e.target.value })}
        >
          <option value="">Tous les tags</option>
          {(tags.data ?? []).map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          aria-label="Trier"
          className="w-auto"
          onChange={(e) => update({ sort: e.target.value })}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Segmented
          label="Base de calcul"
          options={BASIS}
          value={basis}
          onChange={(next) => update({ basis: next })}
        />
      </form>

      {recipes.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title={q || tag ? 'Aucune recette ne correspond' : 'Aucune recette pour l’instant'}
          description={
            q || tag
              ? 'Essaie un autre mot-clé ou retire le filtre de tag.'
              : 'Crée la première recette : les macros se calculeront automatiquement.'
          }
          action={
            <Link href="/recipes/new" className={buttonClasses({ size: 'sm' })}>
              <Plus className="size-3.5" aria-hidden />
              Nouvelle recette
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((recipe) => (
            <li key={recipe.id}>
              <Link href={`/recipes/${recipe.id}`} className="block rounded-2xl">
                <CardLink className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold leading-snug tracking-[-0.02em] text-ink-900">
                      {recipe.name}
                    </h2>
                    <Rating average={recipe.rating.average} count={recipe.rating.count} />
                  </div>
                  <p className="mt-1 text-sm text-ink-500">par {recipe.author.displayName}</p>

                  <div className="tabular mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-700">
                    <span className="flex items-center gap-1.5">
                      <Flame className="size-3.5 text-peach-500" aria-hidden />
                      {Math.round(recipe.nutrition.perServing.kcal)} kcal
                    </span>
                    <span>{Math.round(recipe.nutrition.perServing.protein)} g prot.</span>
                    <span className="text-ink-500">
                      {Math.round(recipe.nutrition.perServing.carbs)} g gluc.
                    </span>
                    <span className="text-ink-500">{Math.round(recipe.nutrition.perServing.fat)} g lip.</span>
                  </div>

                  {recipe.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {recipe.tags.slice(0, 3).map((t) => (
                        <Badge key={t.tag.slug} tone="sage">
                          {t.tag.label}
                        </Badge>
                      ))}
                      {recipe.tags.length > 3 ? <Badge>+{recipe.tags.length - 3}</Badge> : null}
                    </div>
                  ) : null}
                </CardLink>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Rating({ average, count }: { average: number | null; count: number }) {
  if (count === 0) {
    return <span className="shrink-0 text-xs text-ink-400">Pas de note</span>;
  }
  return (
    <span className="tabular flex shrink-0 items-center gap-1 text-sm font-medium text-ink-900">
      <Star className="size-3.5 fill-peach-400 text-peach-400" aria-hidden />
      {average?.toFixed(1)}
      <span className="text-xs font-normal text-ink-400">({count})</span>
    </span>
  );
}

export default function RecipesPage() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      }
    >
      <RecipesInner />
    </Suspense>
  );
}
