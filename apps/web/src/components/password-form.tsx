'use client';

import { useState, type FormEvent } from 'react';
import { Check, KeyRound, TriangleAlert } from 'lucide-react';
import { PASSWORD_MIN_LENGTH, validatePassword } from '@cuisinons/shared';
import { Button, Card, Field, Input } from '@cuisinons/ui';
import { apiFetch } from '@/lib/api';

export function PasswordForm() {
  const [next, setNext] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Meme regle que le serveur, evaluee ici pour donner la raison avant l'envoi.
  const check = next.length > 0 ? validatePassword(next) : null;
  const localError = check && !check.ok ? check.message : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setResult(null);
    const res = await apiFetch('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: String(form.get('currentPassword')),
        nextPassword: String(form.get('nextPassword')),
      }),
    });
    setPending(false);
    setResult(
      res.ok
        ? { ok: true, message: 'Mot de passe mis à jour. Reconnecte-toi.' }
        : { ok: false, message: 'Impossible de modifier le mot de passe. Vérifie le mot de passe actuel.' },
    );
  }

  return (
    <Card className="max-w-md">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Mot de passe actuel">
          {({ id }) => (
            <Input id={id} name="currentPassword" type="password" autoComplete="current-password" required />
          )}
        </Field>
        <Field
          label="Nouveau mot de passe"
          hint={`Au moins ${String(PASSWORD_MIN_LENGTH)} caractères, avec une lettre et un chiffre.`}
          error={localError}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              name="nextPassword"
              type="password"
              autoComplete="new-password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" icon={KeyRound} loading={pending} disabled={localError !== null || next.length === 0}>
          Enregistrer
        </Button>
        {result ? (
          <p
            role="status"
            className={`flex items-start gap-2 text-sm ${result.ok ? 'text-sage-600' : 'text-tomato-500'}`}
          >
            {result.ok ? (
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            {result.message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
