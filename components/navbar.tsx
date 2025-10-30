"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { getCurrentUser } from "@/app/actions/auth";
import { useEffect, useState } from "react";

export function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const result = await getCurrentUser();
      if ('user' in result && result.user) {
        setUser(result.user);
      }
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src="/kroni.png"
              alt="Kroni mascot"
              width={32}
              height={32}
              className="rounded-full"
            />
            <h1 className="text-xl font-semibold text-foreground">
              Kroni-Toudou
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center space-x-3 mr-2">
                  <Link href="/home" className="text-sm text-foreground hover:underline">
                    Accueil
                  </Link>
                  <Link href="/mes-taches" className="text-sm text-foreground hover:underline">
                    Mes tâches
                  </Link>
                </div>
                <span className="text-sm text-muted-foreground">
                  {user.user_metadata?.username || user.email}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="cursor-pointer">
                  Déconnexion
                </Button>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Non connecté
              </span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
