import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

/** Ancien chemin : la proposition s’ouvre en feuille sur la liste. */
export default function SuggestPermalink() {
  redirect(routes.recetteProposer);
}
