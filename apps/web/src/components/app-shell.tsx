'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  ChefHat,
  LogOut,
  Plus,
  Refrigerator,
  ShoppingBasket,
  Target,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { type StorageArea } from '@cuisinons/shared';
import { buttonClasses, cn, IconButton, transitions } from '@cuisinons/ui';
import { apiFetch, apiJson } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useAuth } from './auth-provider';
import { Avatar } from './avatar';
import { BrandMark } from './brand-mark';

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: routes.planning, label: 'Planning', icon: CalendarDays },
  { href: routes.recettes, label: 'Recettes', icon: ChefHat },
  { href: routes.courses, label: 'Courses', icon: ShoppingBasket },
  { href: routes.reserves, label: 'Réserves', icon: Refrigerator },
  { href: routes.objectifs, label: 'Objectifs', icon: Target },
];

/** Cinq onglets au maximum : au-dela, les cibles deviennent trop etroites. */
const TABS: NavItem[] = [
  { href: routes.planning, label: 'Planning', icon: CalendarDays },
  { href: routes.recettes, label: 'Recettes', icon: ChefHat },
  { href: routes.courses, label: 'Courses', icon: ShoppingBasket },
  { href: routes.reserves, label: 'Réserves', icon: Refrigerator },
  { href: routes.profil, label: 'Profil', icon: UserRound },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const planning = pathname === routes.planning;

  return (
    <div
      className={cn(
        'min-h-dvh',
        planning && 'max-lg:flex max-lg:h-dvh max-lg:flex-col max-lg:overflow-hidden',
      )}
    >
      <DesktopSidebar pathname={pathname} />
      <MobileHeader />
      {/*
        La marge gauche est portee par le contenu, pas par une colonne de grille :
        la barre laterale est en position fixe, donc sa place ne depend ni de la
        largeur de la page, ni de la presence d'un ascenseur. Rien ne peut la
        decaler d'une page a l'autre.
      */}
      <main
        className={cn(
          'lg:pl-[17rem]',
          planning &&
            'max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden',
        )}
      >
        {/* Le planning occupe toute la largeur utile : les colonnes de jours
            grandissent avec l'ecran. Les autres pages gardent une mesure de texte. */}
        <div
          className={cn(
            'mx-auto w-full',
            planning
              ? 'flex min-h-0 max-w-none flex-1 flex-col overflow-hidden px-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-3 sm:px-8 lg:block lg:overflow-visible lg:px-8 lg:pb-14 lg:pt-10'
              : 'max-w-[88rem] px-4 pb-28 pt-6 sm:px-8 lg:pb-14 lg:pt-10',
          )}
        >
          {/*
            Animation d'entree en CSS et non en JS : un `initial: opacity 0` pose
            par Motion serait rendu tel quel cote serveur, donc la page resterait
            invisible tant que l'hydratation n'a pas eu lieu. La cle relance
            l'animation a chaque changement d'URL.
          */}
          <div
            key={pathname}
            className={cn(
              'animate-rise',
              planning && 'flex min-h-0 flex-1 flex-col overflow-hidden lg:overflow-visible',
            )}
          >
            {children}
          </div>
        </div>
      </main>
      <MobileTabBar pathname={pathname} />
    </div>
  );
}

/**
 * Etat des provisions, partage entre la barre laterale et les ecrans dedies :
 * les cles de cache sont les memes, donc une modification faite sur la page des
 * courses met la barre a jour sans requete supplementaire.
 */
function useProvisionsSummary() {
  const summary = useQuery({
    queryKey: ['provisions-summary'],
    queryFn: () =>
      apiJson<{ counts: Partial<Record<StorageArea, number>>; toBuy: number }>('/api/bff/provisions/summary'),
    staleTime: 30_000,
  });
  return { toBuy: summary.data?.toBuy ?? 0 };
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  const { toBuy } = useProvisionsSummary();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-white/60 bg-white/40 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Link href={routes.planning} className="inline-flex rounded-2xl">
          <BrandMark size="sm" align="start" />
        </Link>
      </div>

      <div className="mt-6 px-1">
        <Link
          href={routes.recetteNouvelle}
          className={buttonClasses({ block: true, className: 'bg-[#8c684f] hover:bg-[#7a5b45]' })}
        >
          <Plus className="size-4" aria-hidden />
          Nouvelle recette
        </Link>
      </div>

      <nav aria-label="Navigation principale" className="mt-6 flex flex-col gap-1">
        {NAV.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            pathname={pathname}
            badge={item.href === routes.courses && toBuy > 0 ? toBuy : undefined}
          />
        ))}
      </nav>

      <UserCard pathname={pathname} />
    </aside>
  );
}

function SidebarItem({
  item,
  pathname,
  badge,
}: {
  item: NavItem;
  pathname: string;
  badge?: number;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-200 ease-out-soft',
        active ? 'font-medium text-ink-900' : 'text-ink-500 hover:text-ink-900',
      )}
    >
      {active ? (
        <motion.span
          layoutId="sidebar-active"
          transition={transitions.spring}
          className="glass absolute inset-0 rounded-xl"
        />
      ) : null}
      <Icon className="relative size-4 shrink-0" aria-hidden />
      <span className="relative flex-1 truncate">{item.label}</span>
      {badge !== undefined ? (
        <span className="tabular relative rounded-full bg-sage-500 px-2 py-0.5 text-[11px] font-medium text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function UserCard({ pathname }: { pathname: string }) {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const active = isActive(pathname, routes.profil);

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await refresh();
    router.replace(routes.connexion);
  }

  return (
    <div className="mt-auto flex items-center gap-1">
      <Link
        href={routes.profil}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 transition-colors duration-200 ease-out-soft',
          active ? 'text-ink-900' : 'hover:bg-ink-900/5',
        )}
      >
        {active ? (
          <motion.span
            layoutId="sidebar-active"
            transition={transitions.spring}
            className="glass absolute inset-0 rounded-2xl"
          />
        ) : null}
        <Avatar
          name={user?.displayName}
          src={user?.avatarUrl}
          className="relative size-9 rounded-full text-sm"
        />
        <span className="relative min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-900">{user?.displayName}</span>
          <span className="block truncate text-xs text-ink-500">{user?.email}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors duration-200 ease-out-soft hover:bg-ink-900/5 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function MobileHeader() {
  const { refresh } = useAuth();
  const router = useRouter();

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await refresh();
    router.replace(routes.connexion);
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Link href={routes.planning} className="inline-flex rounded-2xl">
        <BrandMark size="sm" align="start" />
      </Link>
      <IconButton icon={LogOut} label="Se déconnecter" variant="ghost" onClick={() => void logout()} />
    </header>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Navigation principale"
      // pb-safe : la barre reste au-dessus de l'indicateur d'accueil iOS.
      className="glass fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-3xl p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] transition-colors duration-200 ease-out-soft',
              active ? 'font-medium text-ink-900' : 'text-ink-400',
            )}
          >
            {active ? (
              <motion.span
                layoutId="tab-active"
                transition={transitions.spring}
                className="absolute inset-0 rounded-2xl bg-white/80 shadow-soft"
              />
            ) : null}
            <Icon className="relative size-5" aria-hidden />
            <span className="relative">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
