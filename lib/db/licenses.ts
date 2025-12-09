import { supabaseServer } from '@/lib/supabase/supabase-server';

export async function validateLicense(
  licenseKey: string,
): Promise<{ valid: boolean; error?: string }> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('licences')
    .select('key, user_id, active, expires_at')
    .eq('key', licenseKey)
    .maybeSingle();

  if (error) {
    console.error('Error validating license:', error);
    return { valid: false, error: 'Erreur lors de la vérification de la licence' };
  }

  if (!data) {
    return { valid: false, error: 'Licence introuvable' };
  }

  // Check if license is already used
  if (data.user_id) {
    return { valid: false, error: 'Cette licence est déjà utilisée' };
  }

  // Check if license is active (default true if null)
  if (data.active === false) {
    return { valid: false, error: 'Cette licence est désactivée' };
  }

  // Check if license is expired
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      return { valid: false, error: 'Cette licence a expiré' };
    }
  }

  return { valid: true };
}

export async function associateLicenseToUser(
  licenseKey: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await supabaseServer();

  // First validate the license again
  const validation = await validateLicense(licenseKey);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Associate the license to the user
  const { error } = await supabase
    .from('licences')
    .update({ user_id: userId })
    .eq('key', licenseKey);

  if (error) {
    console.error('Error associating license to user:', error);
    return { success: false, error: "Erreur lors de l'association de la licence" };
  }

  return { success: true };
}
