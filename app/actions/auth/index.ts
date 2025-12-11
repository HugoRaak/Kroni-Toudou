'use server';

import { supabaseServer } from '@/lib/supabase/supabase-server';
import { redirect } from 'next/navigation';
import { validateLicense } from '@/lib/db/licenses';

function translateError(errorMessage: string): string {
  const errorLower = errorMessage.toLowerCase();

  if (
    errorLower.includes('invalid login credentials') ||
    errorLower.includes('invalid credentials')
  ) {
    return 'Identifiants invalides. Vérifiez votre email et votre mot de passe.';
  }
  if (errorLower.includes('email not confirmed')) {
    return "Votre email n'est pas confirmé. Veuillez vérifier votre boîte de réception.";
  }
  if (errorLower.includes('user already registered') || errorLower.includes('already registered')) {
    return 'Cet utilisateur est déjà enregistré.';
  }
  if (
    errorLower.includes('password should be at least') ||
    errorLower.includes('password too short')
  ) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (errorLower.includes('email already exists') || errorLower.includes('user already exists')) {
    return 'Cet email est déjà utilisé.';
  }
  if (errorLower.includes('invalid email')) {
    return 'Adresse email invalide.';
  }
  if (errorLower.includes('email rate limit')) {
    return 'Trop de tentatives. Veuillez réessayer plus tard.';
  }
  if (errorLower.includes('signup disabled')) {
    return 'Les inscriptions sont actuellement désactivées.';
  }

  return "Une erreur est survenue lors de l'authentification. Veuillez réessayer.";
}

export async function signIn(email: string, password: string) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: translateError(error.message) };
  }

  return { success: true, user: data.user };
}

export async function signUp(
  email: string,
  password: string,
  username: string,
  licenseKey: string,
) {
  // Sanitize and validate username
  const sanitizedUsername = username.trim();
  if (!sanitizedUsername) {
    return { error: "Le nom d'utilisateur est requis" };
  }
  if (sanitizedUsername.length > 20) {
    return { error: "Le nom d'utilisateur doit contenir au plus 20 caractères" };
  }

  // Sanitize license key
  const sanitizedLicenseKey = licenseKey.trim();
  if (!sanitizedLicenseKey) {
    return { error: 'La clé de licence est requise' };
  }

  // Validate license before creating account
  const licenseValidation = await validateLicense(sanitizedLicenseKey);
  if (!licenseValidation.valid) {
    return { error: licenseValidation.error || 'Licence invalide' };
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: sanitizedUsername,
        pending_license_key: sanitizedLicenseKey, // Store license key in user metadata until email is confirmed
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home`,
    },
  });

  if (error) {
    return { error: translateError(error.message) };
  }

  // License will be associated when email is confirmed (handled in home page)

  // Si l'utilisateur doit confirmer son email
  if (data.user && !data.session) {
    return {
      success: true,
      user: data.user,
      needsConfirmation: true,
      message: 'Un email de confirmation a été envoyé. Veuillez vérifier votre boîte de réception.',
    };
  }

  return { success: true, user: data.user };
}

export async function signOut() {
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  redirect('/');
}

