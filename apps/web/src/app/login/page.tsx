'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { BrandMark } from '@/components/brand-mark';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

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
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <picture>
          <source media="(min-width: 1024px)" srcSet="/brand/auth-bg-desktop.png" />
          <img src="/brand/auth-bg-mobile.png" alt="" className="size-full object-cover" />
        </picture>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,248,240,0.12)_0%,rgba(28,25,23,0.22)_62%,rgba(28,25,23,0.48)_100%)]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-auth rounded-[36px] p-8">
          <BrandMark
            size="lg"
            titleAs="h1"
            subtitle="Recettes, planning et nutrition — privé, pour deux."
          />
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
          <form className="space-y-4" method="post" action="/login" onSubmit={onSubmit}>
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
              disabled={!hydrated || pending}
              className="flex min-h-12 w-full items-center justify-center rounded-full bg-stone-900 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
