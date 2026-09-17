'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { RecipeEditor } from '@/components/recipe-editor';

export default function EditRecipePage() {
  const { id } = useParams<{ id: string }>();
  const recipe = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => apiJson<Record<string, unknown>>(`/api/bff/recipes/${id}`),
  });
  if (recipe.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!recipe.data) return <p className="text-sm text-ink-600">Cette recette est introuvable.</p>;
  return <RecipeEditor existing={recipe.data} />;
}
