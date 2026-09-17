'use client';

import { PasswordForm } from '@/components/password-form';

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Sécurité</h1>
      <p className="text-sm text-stone-500">Pas de récupération par e-mail. Le mot de passe se change ici uniquement.</p>
      <PasswordForm />
    </div>
  );
}
