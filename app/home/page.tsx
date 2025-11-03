import { supabaseServerReadOnly } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { createTaskFromForm } from '@/app/actions/tasks';
import { revalidatePath } from 'next/cache';
import type { Task } from '@/lib/types';
import { LicenseProcessor } from '@/components/license-processor';
import { CalendarWithAddButton } from '@/components/calendar-with-add-button';

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

async function updateTaskFromForm(formData: FormData) {
  'use server';
  const { updateTaskAction } = await import('@/app/actions/tasks');
  const { parseTaskFormData, parsedDataToTaskUpdates } = await import('@/lib/task-form-parser');
  
  const id = String(formData.get('id'));
  const parsed = parseTaskFormData(formData);
  
  if (!parsed) {
    return false;
  }

  const updates = parsedDataToTaskUpdates(parsed);
  const result = await updateTaskAction(id, updates);
  
  if (result) {
    revalidatePath('/');
    revalidatePath('/mes-taches');
  }
  return !!result;
}

async function deleteTask(id: string) {
  'use server';
  const { deleteTaskAction } = await import('@/app/actions/tasks');
  const result = await deleteTaskAction(id);
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
      <LicenseProcessor />
      <Navbar />
      <main className="container mx-auto px-4 pt-4 pb-8">
        <CalendarWithAddButton
          userId={user.id}
          onUpdateTask={updateTaskFromForm}
          onDeleteTask={deleteTask}
          onSubmit={createTaskAction}
        />
      </main>
    </div>
  );
}
