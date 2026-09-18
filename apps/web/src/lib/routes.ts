/** Chemins visibles dans le navigateur. Les dossiers App Router restent en anglais. */
export const routes = {
  connexion: '/connexion',
  planning: '/planning',
  recettes: '/recettes',
  recetteNouvelle: '/recettes/nouvelle',
  recetteProposer: '/recettes?proposer=1',
  recette: (id: string) => `/recettes/${id}`,
  recetteModifier: (id: string) => `/recettes/${id}/modifier`,
  courses: '/courses',
  reserves: '/reserves',
  objectifs: '/objectifs',
  profil: '/profil',
  profilStatistiques: '/profil/statistiques',
  profilSecurite: '/profil/securite',
} as const;

export function withSearch(path: string, search: URLSearchParams | string) {
  const qs = typeof search === 'string' ? search : search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function recetteIdFromSearch(params: { get(name: string): string | null }) {
  return params.get('recette') ?? params.get('recipe');
}
