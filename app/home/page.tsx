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
  
  const id = String(formData.get('id'));
  const title = String(formData.get('title') || '');
  const description = String(formData.get('description') || '');
  const taskType = String(formData.get('taskType') || '');
  const frequencyRaw = String(formData.get('frequency') || '');
  const dayRaw = String(formData.get('day') || '');
  const due_onRaw = String(formData.get('due_on') || '');
  const postponed_daysRaw = String(formData.get('postponed_days') || '');
  const is_remote = formData.get('is_remote') != null;

  let updates: Partial<Task> = {
    title,
    description,
    is_remote,
    frequency: undefined,
    day: undefined,
    due_on: undefined,
    postponed_days: undefined,
    in_progress: undefined,
  };

  if (taskType === 'periodic') {
    updates.frequency = frequencyRaw ? (frequencyRaw as Task['frequency']) : undefined;
    updates.day = dayRaw ? (dayRaw as Task['day']) : undefined;
  } else if (taskType === 'specific') {
    updates.due_on = due_onRaw || undefined;
    updates.postponed_days = postponed_daysRaw ? Number(postponed_daysRaw) : undefined;
  } else if (taskType === 'when-possible') {
    updates.in_progress = formData.get('in_progress') != null;
  }

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
