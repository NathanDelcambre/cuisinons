'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Images, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { Button, Card, NavRow, PageHeader } from '@cuisinons/ui';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';

const LINKS = [
  {
    href: '/settings/security',
    icon: ShieldCheck,
    label: 'Sécurité et mot de passe',
    description: 'Changer le mot de passe du compte',
  },
  {
    href: '/dev/icons',
    icon: Images,
    label: 'Rapport des illustrations',
    description: 'Couverture des icônes d’ingrédients',
  },
];

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await refresh();
    router.replace('/login');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profil" />

      <Card className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sage-400 text-xl font-semibold text-white"
        >
          {user?.displayName?.[0]?.toUpperCase() ?? '·'}
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold tracking-[-0.02em] text-ink-900">
            {user?.displayName}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-ink-500">
            <Mail className="size-3.5 shrink-0" aria-hidden />
            {user?.email}
          </p>
        </div>
      </Card>

      <nav className="space-y-2">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="block rounded-2xl">
            <NavRow icon={link.icon} label={link.label} description={link.description} />
          </Link>
        ))}
      </nav>

      <Button variant="glass" icon={LogOut} onClick={() => void logout()}>
        Se déconnecter
      </Button>
    </div>
  );
}
