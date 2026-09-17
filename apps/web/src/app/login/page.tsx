'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError('Impossible de se connecter. Vérifie tes identifiants.');
      return;
    }
    await refresh();
    router.replace('/planning');
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="glass rounded-[36px] p-8">
        <p className="text-center text-sm tracking-[0.3em] text-stone-400 uppercase">Privé</p>
        <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight">Cuisinons</h1>
        <a
          href="/api/auth/google"
          className="mt-8 flex min-h-12 items-center justify-center rounded-full bg-stone-900 text-sm font-medium text-white"
        >
          Continuer avec Google
        </a>
        <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
          <span className="h-px flex-1 bg-stone-200" />
          ou
          <span className="h-px flex-1 bg-stone-200" />
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            Adresse e-mail
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              className="mt-1 w-full rounded-2xl border border-stone-200 bg-white/70 px-4 py-3"
            />
          </label>
          <label className="block text-sm">
            Mot de passe
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-2xl border border-stone-200 bg-white/70 px-4 py-3"
            />
          </label>
          {error ? <p className="text-sm text-[#c45c4a]">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-stone-900 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  );
}
