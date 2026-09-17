import Link from 'next/link';
import { CalendarDays, Compass } from 'lucide-react';
import { Panel, buttonClasses } from '@cuisinons/ui';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Panel className="max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-sage-100 text-sage-600"
        >
          <Compass className="size-5" />
        </span>
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">Page introuvable</h1>
        <p className="mt-2 text-sm text-ink-500">Cette adresse ne correspond à aucun écran de Cuisinons.</p>
        <Link href="/planning" className={buttonClasses({ className: 'mt-6' })}>
          <CalendarDays className="size-4" aria-hidden />
          Retour au planning
        </Link>
      </Panel>
    </main>
  );
}
