import { supabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Calendar } from '@/components/calendar';

export default async function Home() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Calendar userId={user.id} />
      </main>
    </div>
  );
}
