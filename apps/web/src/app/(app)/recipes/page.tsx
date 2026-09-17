'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { apiJson } from '@/lib/api';

type Recipe = {
  id: string;
  name: string;
  author: { displayName: string };
  nutrition: { perServing: { kcal: number; protein: number; carbs: number; fat: number } };
  rating: { average: number | null; count: number };
  tags: Array<{ tag: { slug: string; label: string } }>;
};

function RecipesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = params.get('sort') ?? 'date';
  const basis = (params.get('basis') as 'serving' | '100g') ?? 'serving';
  const [draft, setDraft] = useState(q);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Recettes</h1>
        <Link href="/recipes/new" className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">
          Nouvelle recette
        </Link>
      </div>
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: draft });
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Rechercher"
          className="glass min-h-11 min-w-56 flex-1 rounded-full px-4"
        />
        <select className="glass rounded-full px-3 py-2 text-sm" value={tag} onChange={(e) => update({ tag: e.target.value })}>
          <option value="">Tous les tags</option>
          {(tags.data ?? []).map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>
        <select className="glass rounded-full px-3 py-2 text-sm" value={sort} onChange={(e) => update({ sort: e.target.value })}>
          <option value="date">Date</option>
          <option value="name">Nom</option>
          <option value="rating-desc">Note décroissante</option>
          <option value="rating-asc">Note croissante</option>
          <option value="protein-desc">Protéines décroissantes</option>
          <option value="protein-asc">Protéines croissantes</option>
          <option value="carbs-desc">Glucides décroissants</option>
          <option value="carbs-asc">Glucides croissants</option>
          <option value="kcal-desc">Calories décroissantes</option>
          <option value="kcal-asc">Calories croissantes</option>
        </select>
        <select className="glass rounded-full px-3 py-2 text-sm" value={basis} onChange={(e) => update({ basis: e.target.value })}>
          <option value="serving">Par portion</option>
          <option value="100g">Pour 100 g</option>
        </select>
      </form>
      {recipes.isLoading ? <p>Chargement…</p> : null}
      {recipes.data?.length === 0 ? <p className="text-stone-500">Aucune recette pour l’instant.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(recipes.data ?? []).map((recipe) => (
          <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="glass rounded-[28px] p-5 transition hover:-translate-y-0.5">
            <h2 className="text-lg font-medium">{recipe.name}</h2>
            <p className="mt-1 text-sm text-stone-500">par {recipe.author.displayName}</p>
            <p className="mt-3 text-sm">
              {Math.round(recipe.nutrition.perServing.kcal)} kcal · {Math.round(recipe.nutrition.perServing.protein)} g prot.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              {recipe.rating.count === 0
                ? 'Pas encore de note'
                : `${recipe.rating.average?.toFixed(1)} / 5 (${recipe.rating.count} note${recipe.rating.count > 1 ? 's' : ''})`}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function RecipesPage() {
  return (
    <Suspense>
      <RecipesInner />
    </Suspense>
  );
}
