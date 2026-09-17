'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button, Panel } from '@cuisinons/ui';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Panel className="max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-tomato-100 text-tomato-500"
        >
          <TriangleAlert className="size-5" />
        </span>
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
          Une erreur est survenue
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Rien n’a été perdu. Relance l’écran : si le problème persiste, recharge la page.
        </p>
        <Button icon={RotateCcw} className="mt-6" onClick={reset}>
          Réessayer
        </Button>
      </Panel>
    </main>
  );
}
