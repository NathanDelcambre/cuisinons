'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { RecipeEditor } from '@/components/recipe-editor';

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const recipe = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => apiJson<Record<string, unknown>>(`/api/bff/recipes/${id}`),
  });
  if (recipe.isLoading) return <p>Chargement…</p>;
  if (!recipe.data) return <p>Recette introuvable.</p>;
  return <RecipeEditor existing={recipe.data} />;
}
