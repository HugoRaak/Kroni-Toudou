"use client";

import { useState, useEffect } from "react";
import { signIn, signUp } from '@/app/actions/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

interface AuthFormProps {
  mode: "login" | "signup";
  onSuccess: () => void;
  onModeChange?: () => void;
}

export function AuthForm({ mode, onSuccess, onModeChange }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setError("");
    setSuccessMessage("");
    setEmailSent(false);
  };

  // Réinitialiser le formulaire quand le mode change
  useEffect(() => {
    resetForm();
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = mode === "login" 
        ? await signIn(email, password)
        : await signUp(email, password, username);

      if ('error' in result) {
        setError(result.error || "Une erreur est survenue");
      } else if ('needsConfirmation' in result && result.needsConfirmation) {
        setSuccessMessage(result.message || "Email de confirmation envoyé");
        setEmailSent(true);
        // Ne pas fermer le dialog, laisser l'utilisateur voir le message
      } else {
        onSuccess();
      }
    } catch (err) {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
            Nom d'utilisateur
          </label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Votre nom d'utilisateur"
            required
            disabled={emailSent}
          />
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          required
          disabled={emailSent}
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          Mot de passe
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          disabled={emailSent}
        />
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
          {successMessage}
        </div>
      )}

      <div className="space-y-2">
        <Button 
          type="submit" 
          className="w-full cursor-pointer" 
          disabled={loading || emailSent}
        >
          {loading ? "Chargement..." : mode === "login" ? "Se connecter" : "S'inscrire"}
        </Button>
        
        {emailSent && (
          <Button 
            type="button" 
            variant="outline" 
            className="w-full cursor-pointer" 
            onClick={resetForm}
          >
            Recommencer
          </Button>
        )}
      </div>
    </form>
  );
}

export function AuthDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const handleSuccess = () => {
    setIsOpen(false);
    window.location.href = '/home';
  };

  const handleModeChange = (newMode: "login" | "signup") => {
    setMode(newMode);
  };

  const resetForm = () => {
    // Cette fonction sera appelée par le composant AuthForm
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer">
          Se connecter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
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
        
        <AuthForm mode={mode} onSuccess={handleSuccess} onModeChange={resetForm} />
        
        <div className="text-center">
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
      </DialogContent>
    </Dialog>
  );
}
