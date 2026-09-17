'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { BrandMark } from '@/components/brand-mark';

function GoogleLogo() {
  return (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white"
    >
      <svg viewBox="0 0 48 48" className="size-3.5">
        <path
          fill="#4285F4"
          d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.3 6.5v5.4h7c4.1-3.8 6.6-9.4 6.6-16.1z"
        />
        <path
          fill="#34A853"
          d="M24 46c5.8 0 10.7-1.9 14.3-5.2l-7-5.4c-1.9 1.3-4.4 2.1-7.3 2.1-5.6 0-10.4-3.8-12.1-8.9h-7.2v5.6C8.3 41.3 15.6 46 24 46z"
        />
        <path
          fill="#FBBC05"
          d="M11.9 28.6c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.6H4.7C3.1 18 2.2 20.9 2.2 24.5s.9 6.5 2.5 9.7l7.2-5.6z"
        />
        <path
          fill="#EA4335"
          d="M24 11.4c3.2 0 6 1.1 8.2 3.2l6.2-6.2C34.7 5 29.8 3 24 3 15.6 3 8.3 7.7 4.7 14.8l7.2 5.6C13.6 15.2 18.4 11.4 24 11.4z"
        />
      </svg>
    </span>
  );
}

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
          <BrandMark size="lg" titleAs="h1" subtitle="Recettes, planning des repas et macros." />
          <a
            href="/api/auth/google"
            className="mt-8 flex min-h-12 items-center justify-center gap-3 rounded-full bg-stone-900 text-sm font-medium text-white"
          >
            <GoogleLogo />
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
