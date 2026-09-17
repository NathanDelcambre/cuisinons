'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AuthProvider } from './auth-provider';

export function Providers({ children }: { children: ReactNode }) {
  // Chaque lecture traverse le BFF puis l'API puis Postgres : rejouer la meme
  // requete a chaque remontage ou a chaque retour sur l'onglet se paie cher.
  // Une mutation invalide explicitement ses cles, donc `staleTime` ne retarde
  // jamais l'affichage d'un changement fait depuis l'application.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
