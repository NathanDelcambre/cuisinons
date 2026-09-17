import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

/** Les recettes s’ouvrent en feuille sur la liste : un permalink aboutit au même endroit. */
export default async function RecipePermalink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`${routes.recettes}?recette=${encodeURIComponent(id)}`);
}
