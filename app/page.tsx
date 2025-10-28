import { supabaseServerReadOnly } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await supabaseServerReadOnly();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  redirect('/home');
}
