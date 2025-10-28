import { supabaseServerReadOnly } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Calendar } from '@/components/calendar';
import { FloatingAddButton } from '@/components/floating-add-button';

export default async function Home() {
  const supabase = await supabaseServerReadOnly();
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
      <FloatingAddButton userId={user.id} />
    </div>
  );
}
