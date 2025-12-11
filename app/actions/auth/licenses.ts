'use server';

import { supabaseServer } from '@/lib/supabase/supabase-server';
import { associateLicenseToUser } from '@/lib/db/licenses';

// Server Action: Process pending license association
// This must be a Server Action because it modifies cookies (via supabaseServer)
export async function processPendingLicenseAction(): Promise<{ success: boolean; error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Utilisateur non authentifié' };
  }

  // Check if email is confirmed
  if (!user.email_confirmed_at) {
    return { success: false, error: 'Email non confirmé' };
  }

  const pendingLicenseKey = user.user_metadata?.pending_license_key as string | undefined;

  if (!pendingLicenseKey) {
    // No pending license, nothing to do
    return { success: true };
  }

  // Associate the license
  const association = await associateLicenseToUser(pendingLicenseKey, user.id);

  if (!association.success) {
    return association;
  }

  // Remove pending license from user metadata after successful association
  const { error } = await supabase.auth.updateUser({
    data: {
      pending_license_key: null,
    },
  });

  if (error) {
    console.error('Error removing pending license from metadata:', error);
    // Don't fail if we can't remove it, the license is already associated
  }

  return { success: true };
}

