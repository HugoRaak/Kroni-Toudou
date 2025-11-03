"use client";

import { useState, useEffect } from "react";
import { signIn, signUp } from '@/app/actions/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePassword } from '@/lib/auth/auth-helpers';

interface AuthFormProps {
  mode: "login" | "signup";
  onSuccess: () => void;
}

export function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setLicenseKey("");
    setError("");
    setSuccessMessage("");
    setEmailSent(false);
    setPasswordError("");
    setConfirmPasswordError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Réinitialiser le formulaire quand le mode change
  useEffect(() => {
    resetForm();
  }, [mode]);

  // Validate password on change (only for signup)
  useEffect(() => {
    if (mode === "signup" && password) {
      const validation = validatePassword(password);
      setPasswordError(validation.valid ? "" : validation.message);
    } else {
      setPasswordError("");
    }
  }, [password, mode]);

  // Validate password confirmation on change (only for signup)
  useEffect(() => {
    if (mode === "signup" && confirmPassword) {
      if (confirmPassword !== password) {
        setConfirmPasswordError("Les mots de passe ne correspondent pas");
      } else {
        setConfirmPasswordError("");
      }
    } else {
      setConfirmPasswordError("");
    }
  }, [confirmPassword, password, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    // Validation for signup mode
    if (mode === "signup") {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        setError("Le nom d'utilisateur est requis");
        setLoading(false);
        return;
      }
      if (trimmedUsername.length > 20) {
        setError("Le nom d'utilisateur doit contenir au plus 20 caractères");
        setLoading(false);
        return;
      }
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.message);
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        setLoading(false);
        return;
      }
    }

    try {
      const result = mode === "login" 
        ? await signIn(email, password)
        : await signUp(email, password, username.trim(), licenseKey);

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
        <>
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
              autoComplete="username"
              required
              maxLength={20}
              disabled={emailSent}
            />
            <p className="text-xs text-muted-foreground mt-1">20 caractères max</p>
          </div>
          <div>
            <label htmlFor="licenseKey" className="block text-sm font-medium text-foreground mb-1">
              Clé de licence
            </label>
            <Input
              id="licenseKey"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Entrez votre clé de licence"
              required
              disabled={emailSent}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Une clé de licence valide est requise pour créer un compte
            </p>
          </div>
        </>
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
          autoComplete="email"
          required
          disabled={emailSent}
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          Mot de passe
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            disabled={emailSent}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-1"
            tabIndex={-1}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                <line x1="2" x2="22" y1="2" y2="22"/>
              </svg>
            )}
          </button>
        </div>
        {mode === "signup" && passwordError && (
          <p className="text-sm text-destructive mt-1">{passwordError}</p>
        )}
        {mode === "signup" && !passwordError && password && (
          <p className="text-xs text-muted-foreground mt-1">
            Le mot de passe doit contenir au moins 10 caractères avec lettres, chiffres et caractères spéciaux
          </p>
        )}
      </div>

      {mode === "signup" && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              disabled={emailSent}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-1"
              tabIndex={-1}
              aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showConfirmPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                  <line x1="2" x2="22" y1="2" y2="22"/>
                </svg>
              )}
            </button>
          </div>
          {confirmPasswordError && (
            <p className="text-sm text-destructive mt-1">{confirmPasswordError}</p>
          )}
        </div>
      )}

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

