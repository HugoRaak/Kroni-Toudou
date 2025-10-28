"use server";

import { supabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export async function signIn(email: string, password: string) {
  const supabase = await supabaseServer();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, user: data.user };
}

export async function signUp(email: string, password: string, username: string) {
  const supabase = await supabaseServer();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/home`
    }
  });

  if (error) {
    return { error: error.message };
  }

  // Si l'utilisateur doit confirmer son email
  if (data.user && !data.session) {
    return { 
      success: true, 
      user: data.user, 
      needsConfirmation: true,
      message: "Un email de confirmation a été envoyé. Veuillez vérifier votre boîte de réception."
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

  redirect("/");
}

export async function getCurrentUser() {
  const supabase = await supabaseServer();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    return { error: error.message };
  }

  return { user };
}
