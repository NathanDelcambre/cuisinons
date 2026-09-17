'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@cuisinons/ui';
import { PasswordForm } from '@/components/password-form';
import { routes } from '@/lib/routes';

export default function SecurityPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={routes.profil}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors duration-200 ease-out-soft hover:text-ink-900"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Profil
      </Link>

      <PageHeader
        title="Sécurité"
        description="Il n’y a pas de récupération par e-mail : le mot de passe se change uniquement depuis cet écran."
      />

      <PasswordForm />
    </div>
  );
}
