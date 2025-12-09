'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signOut } from '@/app/actions/auth';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { User } from '@supabase/supabase-js';

// Constants extracted outside component to avoid recreation
const LINK_BASE =
  'inline-flex items-center h-8 px-3 rounded-full text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
const LINK_ACTIVE = 'bg-primary/10 text-foreground';
const LINK_INACTIVE = 'text-muted-foreground hover:text-foreground hover:bg-muted';

export function Navbar({ user }: { user: User | null }) {
  const pathname = usePathname();

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/home" className="flex items-center gap-2 group">
            <Image
              src="/kroni.png"
              alt="Kroni mascot"
              width={28}
              height={28}
              style={{ height: 'auto', width: 'auto' }}
              className="rounded-full"
            />
            <span className="text-base font-semibold tracking-tight group-hover:opacity-90">
              Kroni-Toudou
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <nav
                  className="hidden sm:flex items-center gap-2 mr-1"
                  aria-label="Navigation principale"
                >
                  <Link
                    href="/home"
                    className={`${LINK_BASE} ${pathname === '/home' ? LINK_ACTIVE : LINK_INACTIVE}`}
                  >
                    Calendrier
                  </Link>
                  <Link
                    href="/mes-taches"
                    className={`${LINK_BASE} ${pathname?.startsWith('/mes-taches') ? LINK_ACTIVE : LINK_INACTIVE}`}
                  >
                    Mes tâches
                  </Link>
                </nav>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="inline-flex items-center gap-2 rounded-full border px-3 h-8 text-sm bg-background hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
                      aria-label="Ouvrir le menu utilisateur"
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-foreground text-xs font-medium">
                        {(user.user_metadata?.username || user.email || '?')
                          .toString()
                          .trim()
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <span className="hidden md:inline max-w-[160px] truncate text-muted-foreground">
                        {user.user_metadata?.username || user.email}
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="opacity-60"
                      >
                        <path d="M6 9l6 6 6-6" strokeWidth="2" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="leading-snug">
                      <div className="text-sm font-medium text-foreground">
                        {user.user_metadata?.username || 'Utilisateur'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/home" className="cursor-pointer">
                        Calendrier
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/mes-taches" className="cursor-pointer">
                        Mes tâches
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <button onClick={handleSignOut} className="w-full text-left cursor-pointer">
                        Déconnexion
                      </button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Non connecté</span>
                <AuthDialog />
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
