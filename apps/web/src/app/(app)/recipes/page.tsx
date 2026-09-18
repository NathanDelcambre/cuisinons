'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ChefHat, Plus, Sparkles, Star } from 'lucide-react';
import {
  Button,
  CardLink,
  EmptyState,
  OverflowBadges,
  PageHeader,
  Select,
  SearchInput,
  Segmented,
  Skeleton,
  Switch,
  buttonClasses,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { recetteIdFromSearch, routes, withSearch } from '@/lib/routes';
import { RecipeModal } from '@/components/recipe-modal';
import { SuggestDishModal } from '@/components/suggest-dish-modal';
import { RecipeCover } from '@/components/recipe-cover';
import { Avatar } from '@/components/avatar';
import { MacroIcon } from '@/components/macro-icon';
import { avatarUrlForEmail, RECIPE_SOURCE_LABELS, type RecipeListView } from '@cuisinons/shared';

type Macros = { kcal: number; protein: number; carbs: number; fat: number };

type Recipe = {
  id: string;
  name: string;
  photoUrl?: string | null;
  source?: 'USER' | 'CATALOG';
  servings: string;
  author: { displayName: string; email?: string };
  nutrition: { perServing: Macros; per100g: Macros | null };
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

type Filters = {
  q: string;
  tag: string;
  sort: string;
  basis: 'serving' | '100g';
  view: RecipeListView;
};

function filtersFromSearch(params: { get(name: string): string | null }): Filters {
  return {
    q: params.get('q') ?? '',
    tag: params.get('tag') ?? '',
    sort: params.get('sort') ?? 'date',
    basis: params.get('basis') === '100g' ? '100g' : 'serving',
    view: params.get('vue') === 'idees' ? 'ideas' : 'mine',
  };
}

function RecipesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const fromUrl = filtersFromSearch(params);
  const selectedId = recetteIdFromSearch(params);
  const suggestOpen = params.has('proposer');
  const [filters, setFilters] = useState(fromUrl);
  const [draft, setDraft] = useState(fromUrl.q);
  const { q, tag, sort, basis, view } = filters;
  const per100g = basis === '100g';
  const ideas = view === 'ideas';

  useEffect(() => {
    function onPopState() {
      const sp = new URLSearchParams(window.location.search);
      const next = filtersFromSearch(sp);
      setFilters(next);
      setDraft(next.q);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!params.has('recipe')) return;
    const sp = new URLSearchParams(params.toString());
    if (!sp.get('recette')) {
      const legacy = sp.get('recipe');
      if (legacy) sp.set('recette', legacy);
    }
    sp.delete('recipe');
    router.replace(withSearch(routes.recettes, sp), { scroll: false });
  }, [params, router]);

  const recipes = useQuery({
    queryKey: ['recipes', q, tag, sort, basis, view],
    queryFn: () =>
      apiJson<Recipe[]>(
        `/api/bff/recipes?q=${encodeURIComponent(q)}&tag=${encodeURIComponent(tag)}&sort=${sort}&basis=${basis}&view=${view}`,
      ),
    staleTime: 120_000,
  });
  const tags = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiJson<Array<{ id: string; slug: string; label: string }>>('/api/bff/tags'),
    staleTime: 300_000,
  });

  function update(next: Partial<Filters>) {
    setFilters((current) => {
      const merged = { ...current, ...next };
      const sp = new URLSearchParams(window.location.search);
      const encoded: Record<string, string> = {
        q: merged.q,
        tag: merged.tag,
        sort: merged.sort === 'date' ? '' : merged.sort,
        basis: merged.basis === 'serving' ? '' : merged.basis,
        vue: merged.view === 'ideas' ? 'idees' : '',
      };
      for (const [k, v] of Object.entries(encoded)) {
        if (v) sp.set(k, v);
        else sp.delete(k);
      }
      if (sp.has('recipe') && !sp.has('recette')) {
        sp.set('recette', sp.get('recipe') ?? '');
      }
      sp.delete('recipe');
      const href = withSearch(routes.recettes, sp);
      window.history.replaceState(window.history.state, '', href);
      return merged;
    });
  }

  useEffect(() => {
    if (draft === q) return;
    const timer = window.setTimeout(() => update({ q: draft }), 280);
    return () => window.clearTimeout(timer);
  }, [draft, q]);

  function openRecipe(id: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set('recette', id);
    sp.delete('recipe');
    router.replace(withSearch(routes.recettes, sp), { scroll: false });
  }

  function closeRecipe() {
    const sp = new URLSearchParams(params.toString());
    sp.delete('recette');
    sp.delete('recipe');
    router.replace(withSearch(routes.recettes, sp), { scroll: false });
  }

  function openSuggest() {
    const sp = new URLSearchParams(params.toString());
    sp.set('proposer', '1');
    sp.delete('recette');
    sp.delete('recipe');
    router.replace(withSearch(routes.recettes, sp), { scroll: false });
  }

  function closeSuggest() {
    const sp = new URLSearchParams(params.toString());
    sp.delete('proposer');
    router.replace(withSearch(routes.recettes, sp), { scroll: false });
  }

  function onSuggestionAccepted(id: string) {
    const sp = new URLSearchParams(params.toString());
    sp.delete('proposer');
    sp.set('recette', id);
    sp.delete('recipe');
    router.replace(withSearch(routes.recettes, sp), { scroll: false });
  }

  const list = recipes.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          list.length > 0
            ? ideas
              ? `${String(list.length)} idée${list.length > 1 ? 's' : ''}`
              : `${String(list.length)} recette${list.length > 1 ? 's' : ''}`
            : undefined
        }
        title="Recettes"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="glass" icon={Sparkles} onClick={openSuggest}>
              Proposer un plat
            </Button>
            <Link href={routes.recetteNouvelle} className={buttonClasses()}>
              <Plus className="size-4" aria-hidden />
              Nouvelle recette
            </Link>
          </div>
        }
      />

      <form
        className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: draft });
        }}
      >
        <div className="w-full md:w-80 md:max-w-full md:shrink-0">
          <SearchInput
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Rechercher une recette"
            aria-label="Rechercher une recette"
            className="h-11"
          />
        </div>
        <div className="grid w-full grid-cols-2 gap-3 md:flex md:w-auto md:contents">
        <Select
          value={tag}
          aria-label="Filtrer par catégorie"
          className="h-11 min-h-11 w-full md:w-[13.5rem] md:max-w-full md:shrink-0"
          options={[
            { value: '', label: 'Toutes les catégories' },
            ...(tags.data ?? []).map((t) => ({ value: t.slug || t.id, label: t.label })),
          ]}
          onChange={(next) => update({ tag: next })}
        />
        <Select
          value={sort}
          aria-label="Trier"
          className="h-11 min-h-11 w-full md:w-[13.5rem] md:max-w-full md:shrink-0"
          options={SORTS}
          onChange={(next) => update({ sort: next })}
        />
        </div>
        <div className="flex h-11 items-center self-start rounded-full bg-sage-100/80 px-3.5 ring-1 ring-inset ring-sage-200/80">
          <Switch
            label="Pour 100 g"
            checked={per100g}
            onChange={(on) => update({ basis: on ? '100g' : 'serving' })}
            className="gap-2.5"
          />
        </div>
        <Segmented
          label="Vue des recettes"
          className="h-11 shrink-0 self-start md:ml-auto"
          value={view}
          onChange={(next) => update({ view: next })}
          options={[
            { value: 'mine', label: 'Mes recettes' },
            { value: 'ideas', label: 'Idées' },
          ]}
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
          title={
            q || tag
              ? ideas
                ? 'Aucune idée ne correspond'
                : 'Aucune recette ne correspond'
              : ideas
                ? 'Pas encore d’idées'
                : 'Aucune recette pour l’instant'
          }
          description={
            q || tag
              ? 'Essaie un autre mot-clé ou retire le filtre de tag.'
              : ideas
                ? 'Les idées healthy apparaîtront ici.'
                : 'Crée la première recette, ou laisse-nous en proposer une avec tes réserves.'
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" size="sm" variant="glass" icon={Sparkles} onClick={openSuggest}>
                Proposer un plat
              </Button>
              <Link href={routes.recetteNouvelle} className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-3.5" aria-hidden />
                Nouvelle recette
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((recipe) => (
            <li key={recipe.id}>
              <button
                type="button"
                onClick={() => openRecipe(recipe.id)}
                className="block h-full w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
              >
                <CardLink className="flex h-full flex-col overflow-hidden p-0">
                  <RecipeCover src={recipe.photoUrl} />
                  <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 min-h-[2.75em] font-display text-lg font-semibold leading-snug tracking-[-0.02em] text-ink-900">
                      {recipe.name}
                    </h2>
                    <Rating average={recipe.rating.average} count={recipe.rating.count} />
                  </div>
                  <p className="mt-1 flex min-w-0 items-center gap-2 truncate text-sm text-ink-500">
                    {recipe.source === 'CATALOG' ? null : (
                      <Avatar
                        name={recipe.author.displayName}
                        src={recipe.author.email ? avatarUrlForEmail(recipe.author.email) : null}
                        className="size-5 rounded-full text-[9px]"
                      />
                    )}
                    <span className="truncate">
                      {recipe.source === 'CATALOG'
                        ? RECIPE_SOURCE_LABELS.CATALOG
                        : `Proposé par ${recipe.author.displayName}`}
                    </span>
                    <span className="shrink-0 text-ink-400">
                      · {Number(recipe.servings).toLocaleString('fr-FR')} pers.
                    </span>
                  </p>

                  <RecipeMacros
                    macros={per100g ? recipe.nutrition.per100g : recipe.nutrition.perServing}
                    per100g={per100g}
                  />

                  <OverflowBadges
                    className="mt-4"
                    items={recipe.tags.map((t) => ({ key: t.tag.slug, label: t.tag.label }))}
                  />
                  </div>
                </CardLink>
              </button>
            </li>
          ))}
        </ul>
      )}

      <RecipeModal recipeId={selectedId} onClose={closeRecipe} />
      <SuggestDishModal open={suggestOpen} onClose={closeSuggest} onAccepted={onSuggestionAccepted} />
    </div>
  );
}

function RecipeMacros({ macros, per100g }: { macros: Macros | null; per100g: boolean }) {
  if (!macros) {
    return (
      <p className="mt-4 text-sm text-ink-400">
        Poids indisponible{per100g ? ' pour 100 g' : ''}
      </p>
    );
  }
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <p className="tabular flex flex-nowrap items-center gap-x-3 overflow-hidden text-sm text-ink-700">
        <span className="flex shrink-0 items-center gap-1.5">
          <MacroIcon kind="kcal" />
          {Math.round(macros.kcal)} kcal
        </span>
        <span className="flex shrink-0 items-center gap-1 font-bold text-sage-600">
          <MacroIcon kind="protein" />
          {Math.round(macros.protein)} P
        </span>
        <span className="flex shrink-0 items-center gap-1 font-bold text-ink-800">
          <MacroIcon kind="carbs" />
          {Math.round(macros.carbs)} G
        </span>
        <span className="flex shrink-0 items-center gap-1 font-bold text-tomato-500">
          <MacroIcon kind="fat" />
          {Math.round(macros.fat)} L
        </span>
      </p>
      {per100g ? (
        <span className="text-[11px] font-medium text-sage-600">/ 100 g</span>
      ) : (
        <span className="text-[11px] font-medium text-ink-400">/ pers.</span>
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
