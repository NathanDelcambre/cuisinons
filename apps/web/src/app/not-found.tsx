import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold">Page introuvable</h1>
      <Link href="/planning" className="rounded-full bg-stone-900 px-4 py-2 text-white">
        Retour au planning
      </Link>
    </main>
  );
}
