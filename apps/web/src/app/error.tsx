'use client';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
      <button type="button" onClick={reset} className="rounded-full bg-stone-900 px-4 py-2 text-white">
        Réessayer
      </button>
    </main>
  );
}
