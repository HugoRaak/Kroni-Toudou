// Ambiguous: grouping rules chosen as frequency > due_on > else
import { supabaseServerReadOnly } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { getTasks } from '@/lib/db/tasks';
import { Task } from '@/lib/types';
import Image from 'next/image';
import { revalidatePath } from 'next/cache';
import { updateTaskAction, deleteTaskAction } from '@/app/actions/tasks';
import { FloatingAddButton } from '@/components/floating-add-button';
import { createTaskFromForm } from '@/app/actions/tasks';
import { SectionWithFilters } from '@/components/section-with-filters';


async function updateTaskFromForm(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const title = String(formData.get('title') || '');
  const description = String(formData.get('description') || '');
  const taskType = String(formData.get('taskType') || '');
  const frequencyRaw = String(formData.get('frequency') || '');
  const dayRaw = String(formData.get('day') || '');
  const due_onRaw = String(formData.get('due_on') || '');
  const postponed_daysRaw = String(formData.get('postponed_days') || '');
  const modeRaw = String(formData.get('mode') || '');
  const mode: Task['mode'] = (modeRaw === 'Présentiel' || modeRaw === 'Distanciel') ? modeRaw : 'Tous';

  // Préparer les données selon le type de tâche
  let updates: Partial<Task> = {
    title,
    description,
    mode,
    frequency: undefined,
    day: undefined,
    due_on: undefined,
    postponed_days: undefined,
    in_progress: undefined,
  };

  // Adapter les données selon le type
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
  revalidatePath('/mes-taches');
  return !!result;
}

async function createTaskAction(formData: FormData) {
  'use server';
  const supabase = await supabaseServerReadOnly();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const result = await createTaskFromForm(user.id, formData);
  if (result) {
    revalidatePath('/mes-taches');
    revalidatePath('/');
  }
  return result;
}

async function deleteTask(id: string) {
  'use server';
  const result = await deleteTaskAction(id);
  revalidatePath('/mes-taches');
  return result;
}

export default async function MesTachesPage() {
  const supabase = await supabaseServerReadOnly();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const tasks = await getTasks(user.id);

  const periodic = tasks.filter(t => !!t.frequency);
  const specificDate = tasks
    .filter(t => !t.frequency && !!t.due_on)
    .sort((a, b) => {
      // Trier par date ascendante (du plus ancien au plus récent)
      if (!a.due_on || !b.due_on) return 0;
      return a.due_on.localeCompare(b.due_on);
    });
  const whenPossible = tasks
    .filter(t => !t.frequency && !t.due_on)
    .sort((a, b) => {
      // Trier : d'abord celles en cours (in_progress: true), puis les autres
      if (a.in_progress === b.in_progress) return 0;
      if (a.in_progress) return -1; // a en cours vient avant
      return 1; // b en cours vient avant
    });

  const isEmpty = tasks.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <Image
              src="/kroni-glasses.png"
              alt="Kroni"
              width={48}
              height={48}
              className="rounded-md pointer-events-none select-none"
              loading="eager"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">Mes tâches</h1>
            </div>
            <Image
              src="/kroni-jongle.png"
              alt="Kroni"
              width={52}
              height={52}
              className="rounded-md pointer-events-none select-none -mt-4"
              loading="eager"
            />
          </div>
          <div className="mt-4 h-1 w-full bg-gradient-to-r from-yellow-400/40 via-violet-500/30 to-orange-500/30 rounded-full" />
        </div>

        {isEmpty ? (
          <div className="text-sm text-muted-foreground border rounded-md p-6">
            Aucune tâche trouvée.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SectionWithFilters
              title="Périodiques"
              count={periodic.length}
              accent="yellow"
              icon={(
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-yellow-700">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path d="M12 6v6l4 2" strokeWidth="2" />
                </svg>
              )}
              tasks={periodic}
              showFrequencyFilter={true}
              onSubmit={updateTaskFromForm}
              onDelete={deleteTask}
              emptyMessage="Aucune tâche périodique."
            />

            <SectionWithFilters
              title="À date précise"
              count={specificDate.length}
              accent="violet"
              icon={(
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-violet-700">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                  <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                  <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                  <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                </svg>
              )}
              tasks={specificDate}
              showFrequencyFilter={false}
              onSubmit={updateTaskFromForm}
              onDelete={deleteTask}
              emptyMessage="Aucune tâche avec date précise."
            />

            <SectionWithFilters
              title="Quand je peux"
              count={whenPossible.length}
              accent="orange"
              icon={(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-orange-700">
                  <path d="M12 5.5l1.6 3.7 3.7 1.6-3.7 1.6L12 16.1l-1.6-3.7L6.7 10.8l3.7-1.6L12 5.5z" strokeWidth="2" />
                </svg>
              )}
              tasks={whenPossible}
              showFrequencyFilter={false}
              onSubmit={updateTaskFromForm}
              onDelete={deleteTask}
              showProgressStatus={true}
              emptyMessage="Aucune tâche libre."
            />
          </div>
        )}
      </main>
      <FloatingAddButton userId={user.id} onSubmit={createTaskAction} />
    </div>
  );
}


