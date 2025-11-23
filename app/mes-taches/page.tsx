// Ambiguous: grouping rules chosen as frequency > due_on > else
import { supabaseServerReadOnly } from '@/lib/supabase/supabase-server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { getTasks } from '@/lib/db/tasks';
import { groupTasksByType } from '@/lib/tasks/task-filtering';
import Image from 'next/image';
import { 
  updateTaskFromFormAction, 
  deleteTaskActionWrapper, 
  createTaskFromFormAction 
} from '@/app/actions/tasks';
import { FloatingAddButton } from '@/components/tasks/floating-add-button';
import { SectionWithFilters } from '@/components/tasks/section-with-filters';

export default async function MesTachesPage() {
  const supabase = await supabaseServerReadOnly();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  const tasks = await getTasks(user.id);
  const { periodic, specificDate, whenPossible } = groupTasksByType(tasks);
  const isEmpty = tasks.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
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
              onSubmit={updateTaskFromFormAction}
              onDelete={deleteTaskActionWrapper}
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
              onSubmit={updateTaskFromFormAction}
              onDelete={deleteTaskActionWrapper}
              showDateStatusSplit={true}
              emptyMessage="Aucune tâche avec date précise."
              allowEditOrder={false}
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
              onSubmit={updateTaskFromFormAction}
              onDelete={deleteTaskActionWrapper}
              showProgressStatus={true}
              emptyMessage="Aucune tâche libre."
            />
          </div>
        )}
      </main>
      <FloatingAddButton userId={user.id} onSubmit={createTaskFromFormAction} />
    </div>
  );
}


