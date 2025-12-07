"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AuthForm } from "./auth-form";

export function AuthDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [mounted, setMounted] = useState(() => typeof window !== 'undefined');

  const handleSuccess = () => {
    setIsOpen(false);
    window.location.href = '/home';
  };

  const handleModeChange = (newMode: "login" | "signup") => {
    setMode(newMode);
  };

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="cursor-pointer" disabled>
        Se connecter
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer">
          Se connecter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>
            {mode === "login" ? "Connexion" : "Inscription"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login" 
              ? "Connectez-vous à votre compte pour accéder à votre calendrier."
              : "Créez un compte pour commencer à organiser vos tâches."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent pr-4 pl-4">
          <AuthForm mode={mode} onSuccess={handleSuccess} />
          
          <div className="text-center mt-4">
            <Button
              variant="link"
              onClick={() => handleModeChange(mode === "login" ? "signup" : "login")}
              className="text-sm cursor-pointer"
            >
              {mode === "login" 
                ? "Pas de compte ? S'inscrire" 
                : "Déjà un compte ? Se connecter"
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

