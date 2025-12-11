'use server';

import { supabaseServer } from '@/lib/supabase/supabase-server';

type ResetPasswordResult =
  | { success: true }
  | { success: false; message: string };

function translateError(errorMessage: string): string {
  const errorLower = errorMessage.toLowerCase();

  if (errorLower.includes('invalid email')) {
    return 'Adresse email invalide.';
  }
  if (errorLower.includes('email rate limit')) {
    return 'Trop de tentatives. Veuillez réessayer plus tard.';
  }
  if (errorLower.includes('user not found')) {
    return "Aucun compte n'est associé à cet email.";
  }

  return 'Une erreur est survenue. Veuillez réessayer.';
}

export async function requestPasswordResetAction(
  formData: { email: string },
): Promise<ResetPasswordResult> {
  const { email } = formData;

  if (!email || !email.trim()) {
    return { success: false, message: 'L\'email est requis.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { success: false, message: 'Format d\'email invalide.' };
  }

  const supabase = await supabaseServer();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectTo = `${siteUrl}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (error) {
    return { success: false, message: translateError(error.message) };
  }

  return { success: true };
}