'use client';

import { useState, useTransition } from 'react';
import { requestPasswordResetAction } from '@/app/actions/auth/reset-password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.trim()) {
      toast.error('L\'email est requis.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Format d\'email invalide.');
      return;
    }

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email: email.trim() });

      if (result.success) {
        toast.success('Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.');
        setEmailSent(true);
      } else {
        toast.error(result.message);
      }
    });
  };

  if (emailSent) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 p-3 rounded">
          Un email de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception et suivez les instructions.
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setEmailSent(false);
            setEmail('');
          }}
        >
          Envoyer un nouvel email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </div>

      <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
        {isPending ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
      </Button>
    </form>
  );
}

