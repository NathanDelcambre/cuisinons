'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, ChefHat, Plus, Target, UserRound } from 'lucide-react';
import { useAuth } from './auth-provider';

const links = [
  { href: '/planning', label: 'Planning', icon: CalendarDays },
  { href: '/recipes', label: 'Recettes', icon: ChefHat },
  { href: '/recipes/new', label: 'Ajouter', icon: Plus },
  { href: '/goals', label: 'Objectifs', icon: Target },
  { href: '/settings', label: 'Profil', icon: UserRound },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-2 p-6 lg:flex">
        <p className="mb-6 px-3 text-lg font-semibold tracking-tight">Cuisinons</p>
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== '/recipes/new' && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${active ? 'glass text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
            >
              <Icon className="size-4" aria-hidden />
              {link.label}
            </Link>
          );
        })}
        <p className="mt-auto px-3 text-xs text-stone-400">{user?.displayName}</p>
      </aside>
      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10">{children}</main>
      <nav className="glass fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-full p-2 lg:hidden">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-h-11 min-w-11 flex-col items-center justify-center rounded-full px-2 text-[11px] ${active ? 'text-stone-900' : 'text-stone-400'}`}
            >
              <Icon className="size-5" aria-hidden />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
