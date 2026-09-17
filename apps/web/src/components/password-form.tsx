'use client';

import { apiFetch } from '@/lib/api';
import { FormEvent, useState } from 'react';

export function PasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await apiFetch('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: String(form.get('currentPassword')),
        nextPassword: String(form.get('nextPassword')),
      }),
    });
    setMessage(res.ok ? 'Mot de passe mis à jour. Reconnecte-toi.' : 'Impossible de modifier le mot de passe.');
  }
  return (
    <form className="glass max-w-md space-y-3 rounded-[28px] p-5" onSubmit={onSubmit}>
      <label className="block text-sm">
        Mot de passe actuel
        <input name="currentPassword" type="password" required className="mt-1 w-full rounded-2xl border px-3 py-2" />
      </label>
      <label className="block text-sm">
        Nouveau mot de passe
        <input name="nextPassword" type="password" required className="mt-1 w-full rounded-2xl border px-3 py-2" />
      </label>
      <button className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white">Enregistrer</button>
      {message ? <p className="text-sm">{message}</p> : null}
    </form>
  );
}
