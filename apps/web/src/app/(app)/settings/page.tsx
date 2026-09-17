'use client';

import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await refresh();
    router.replace('/login');
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Profil</h1>
      <div className="glass rounded-[28px] p-5">
        <p className="text-lg font-medium">{user?.displayName}</p>
        <p className="text-sm text-stone-500">{user?.email}</p>
      </div>
      <Link href="/settings/security" className="glass block rounded-[28px] p-5">
        Sécurité et mot de passe
      </Link>
      <Link href="/dev/icons" className="glass block rounded-[28px] p-5">
        Rapport des illustrations
      </Link>
      <button className="rounded-full bg-stone-900 px-5 py-3 text-white" onClick={() => void logout()}>
        Se déconnecter
      </button>
    </div>
  );
}
