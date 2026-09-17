'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarDays,
  ChefHat,
  ChevronRight,
  Images,
  LogOut,
  Plus,
  ShieldCheck,
  Target,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { buttonClasses, cn, transitions } from '@cuisinons/ui';
import { apiFetch } from '@/lib/api';
import { useAuth } from './auth-provider';
import { BrandMark } from './brand-mark';

type NavItem = { href: string; label: string; icon: LucideIcon; children?: NavItem[] };

const NAV: NavItem[] = [
  { href: '/planning', label: 'Planning', icon: CalendarDays },
  { href: '/recipes', label: 'Recettes', icon: ChefHat },
  { href: '/goals', label: 'Objectifs', icon: Target },
  {
    href: '/settings',
    label: 'Profil',
    icon: UserRound,
    children: [
      { href: '/settings/security', label: 'Sécurité', icon: ShieldCheck },
      { href: '/dev/icons', label: 'Illustrations', icon: Images },
    ],
  },
];

/** Onglets mobiles : « Ajouter » y garde sa place, faute de barre laterale. */
const TABS: NavItem[] = [
  { href: '/planning', label: 'Planning', icon: CalendarDays },
  { href: '/recipes', label: 'Recettes', icon: ChefHat },
  { href: '/recipes/new', label: 'Ajouter', icon: Plus },
  { href: '/goals', label: 'Objectifs', icon: Target },
  { href: '/settings', label: 'Profil', icon: UserRound },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <DesktopSidebar pathname={pathname} />
      <MobileHeader />
      {/*
        La marge gauche est portee par le contenu, pas par une colonne de grille :
        la barre laterale est en position fixe, donc sa place ne depend ni de la
        largeur de la page, ni de la presence d'un ascenseur. Rien ne peut la
        decaler d'une page a l'autre.
      */}
      <main className="lg:pl-[17rem]">
        {/* Large : la grille de sept jours du planning a besoin de respirer. Les
            ecrans plus etroits en texte posent leur propre largeur maximale. */}
        <div className="mx-auto w-full max-w-[88rem] px-4 pb-28 pt-6 sm:px-8 lg:pb-14 lg:pt-10">
          {/*
            Animation d'entree en CSS et non en JS : un `initial: opacity 0` pose
            par Motion serait rendu tel quel cote serveur, donc la page resterait
            invisible tant que l'hydratation n'a pas eu lieu. La cle relance
            l'animation a chaque changement d'URL.
          */}
          <div key={pathname} className="animate-rise">
            {children}
          </div>
        </div>
      </main>
      <MobileTabBar pathname={pathname} />
    </div>
  );
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-white/60 bg-white/40 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Link href="/planning" className="inline-flex rounded-2xl">
          <BrandMark size="sm" align="start" />
        </Link>
      </div>

      <div className="mt-6 px-1">
        <Link href="/recipes/new" className={buttonClasses({ block: true })}>
          <Plus className="size-4" aria-hidden />
          Nouvelle recette
        </Link>
      </div>

      <nav aria-label="Navigation principale" className="mt-6 flex flex-col gap-1">
        {NAV.map((item) => (
          <SidebarItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <UserCard />
    </aside>
  );
}

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  // Le sous-menu suit la section ouverte : aucun etat local, donc aucun
  // desaccord possible entre l'URL affichee et le menu deploye.
  const expanded = active && Boolean(item.children?.length);

  return (
    <div>
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
        {item.children?.length ? (
          <ChevronRight
            aria-hidden
            className={cn(
              'relative size-3.5 shrink-0 text-ink-400 transition-transform duration-300 ease-out-soft',
              expanded && 'rotate-90',
            )}
          />
        ) : null}
      </Link>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            // L'animation de hauteur evite que les elements suivants ne sautent
            // brutalement a l'ouverture du sous-menu.
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transitions.soft}
            className="overflow-hidden"
          >
            <div className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-ink-200 pl-3">
              {item.children?.map((child) => {
                const childActive = pathname === child.href;
                const ChildIcon = child.icon;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    aria-current={childActive ? 'page' : undefined}
                    className={cn(
                      'flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors duration-200 ease-out-soft',
                      childActive
                        ? 'bg-white/70 font-medium text-ink-900'
                        : 'text-ink-500 hover:bg-white/50 hover:text-ink-900',
                    )}
                  >
                    <ChildIcon className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function UserCard() {
  const { user, refresh } = useAuth();
  const router = useRouter();

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await refresh();
    router.replace('/login');
  }

  return (
    <div className="mt-auto flex items-center gap-3 rounded-2xl px-2 py-2">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-400 text-sm font-semibold text-white"
      >
        {user?.displayName?.[0]?.toUpperCase() ?? '·'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-900">{user?.displayName}</span>
        <span className="block truncate text-xs text-ink-500">{user?.email}</span>
      </span>
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
  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Link href="/planning" className="inline-flex rounded-2xl">
        <BrandMark size="sm" align="start" />
      </Link>
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
