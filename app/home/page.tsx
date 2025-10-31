import { supabaseServerReadOnly } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Calendar } from '@/components/calendar';
import { FloatingAddButton } from '@/components/floating-add-button';
import { createTaskFromForm } from '@/app/actions/tasks';
import { revalidatePath } from 'next/cache';

async function createTaskAction(formData: FormData) {
  'use server';
  const supabase = await supabaseServerReadOnly();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const result = await createTaskFromForm(user.id, formData);
  if (result) {
    revalidatePath('/');
    revalidatePath('/mes-taches');
  }
  return result;
}

export default async function Home() {
  const supabase = await supabaseServerReadOnly();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-4 pb-8">
        <Calendar userId={user.id} />
      </main>
      <FloatingAddButton userId={user.id} onSubmit={createTaskAction} />
    </div>
  );
}
