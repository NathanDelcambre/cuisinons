'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Images, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { Button, Card, NavRow, PageHeader } from '@cuisinons/ui';
import { apiFetch } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';

const LINKS = [
  {
    href: routes.profilSecurite,
    icon: ShieldCheck,
    label: 'Sécurité et mot de passe',
    description: 'Changer le mot de passe du compte',
  },
  {
    href: routes.illustrations,
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
    router.replace(routes.connexion);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profil" />

      <Card className="flex items-center gap-4">
        <Avatar
          name={user?.displayName}
          src={user?.avatarUrl}
          className="size-14 rounded-2xl text-xl"
        />
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
