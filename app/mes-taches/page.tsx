// Ambiguous: grouping rules chosen as frequency > due_on > else
import { supabaseServerReadOnly } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { getTasks } from '@/lib/db/tasks';
import { Task } from '@/lib/types';
import Image from 'next/image';

function Section({
  title,
  count,
  accent,
  icon,
  children,
}: {
  title: string;
  count: number;
  accent: 'yellow' | 'violet' | 'orange';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const accentClasses: Record<string, { bar: string; chip: string; headerBg: string; title: string }> = {
    yellow: {
      bar: 'bg-yellow-400/30',
      chip: 'bg-yellow-100 text-yellow-900',
      headerBg: 'from-yellow-200/50 to-transparent',
      title: 'text-yellow-900',
    },
    violet: {
      bar: 'bg-violet-500/20',
      chip: 'bg-violet-500/10 text-violet-700',
      headerBg: 'from-violet-500/10 to-transparent',
      title: 'text-violet-800',
    },
    orange: {
      bar: 'bg-orange-600/25',
      chip: 'bg-orange-50 text-orange-800',
      headerBg: 'from-orange-200/40 to-transparent',
      title: 'text-orange-800',
    },
  };
  const c = accentClasses[accent];
  return (
    <section className="mb-8 group transition-transform">
      <div className={`relative rounded-md border overflow-hidden shadow-sm hover:shadow-md transition-shadow` }>
        <div className={`absolute inset-0 bg-gradient-to-b ${c.headerBg} pointer-events-none`} />
        <div className={`h-1 ${c.bar}`} />
        <div className="p-4 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background border shadow-sm">
              {icon}
            </span>
            <h2 className={`text-base font-semibold ${c.title}`}>{title}</h2>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${c.chip}`}>{count} tâche{count > 1 ? 's' : ''}</span>
        </div>
        <div className="p-4 pt-0">
          <div className="grid gap-3">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskItem({ task }: { task: Task }) {
  return (
    <div className="rounded-md border p-4 bg-card/50 backdrop-blur-sm hover:bg-card transition-colors shadow-xs hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-foreground">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
          )}
        </div>
        {task.in_progress ? (
          <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-700 border border-blue-500/20">En cours</span>
        ) : null}
      </div>
      <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-2">
        {task.frequency && (
          <span className="px-2 py-1 rounded border bg-muted/50">{task.frequency}</span>
        )}
        {task.day && (
          <span className="px-2 py-1 rounded border bg-muted/50">{task.day}</span>
        )}
        {task.due_on && (
          <span className="px-2 py-1 rounded border bg-muted/50">{new Date(task.due_on).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        )}
        {typeof task.postponed_days === 'number' && (
          <span className="px-2 py-1 rounded border bg-muted/50">à reporter dans {task.postponed_days} jours</span>
        )}
        <span className={`px-2 py-1 rounded border ${task.is_remote ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {task.is_remote ? 'Distanciel' : 'Présentiel'}
        </span>
      </div>
    </div>
  );
}

export default async function MesTachesPage() {
  const supabase = await supabaseServerReadOnly();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const tasks = await getTasks(user.id);

  const periodic = tasks.filter(t => !!t.frequency);
  const specificDate = tasks.filter(t => !t.frequency && !!t.due_on);
  const whenPossible = tasks.filter(t => !t.frequency && !t.due_on);

  const isEmpty = tasks.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-center">Mes tâches</h1>
            </div>
            <Image src="/kroni-glasses.png" alt="Kroni" width={48} height={48} className="rounded-md pointer-events-none select-none" />
          </div>
          <div className="mt-4 h-1 w-full bg-gradient-to-r from-yellow-400/40 via-violet-500/30 to-orange-500/30 rounded-full" />
        </div>

        {isEmpty ? (
          <div className="text-sm text-muted-foreground border rounded-md p-6">
            Aucune tâche trouvée.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Section
              title="Périodiques"
              count={periodic.length}
              accent="yellow"
              icon={(
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-yellow-700">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path d="M12 6v6l4 2" strokeWidth="2" />
                </svg>
              )}
            >
              {periodic.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucune tâche périodique.</div>
              ) : (
                periodic.map(task => <TaskItem key={task.id} task={task} />)
              )}
            </Section>

            <Section
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
            >
              {specificDate.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucune tâche avec date précise.</div>
              ) : (
                specificDate.map(task => <TaskItem key={task.id} task={task} />)
              )}
            </Section>

            <Section
              title="Quand je peux"
              count={whenPossible.length}
              accent="orange"
              icon={(
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-orange-700">
                  <path d="M20 6L9 17l-5-5" strokeWidth="2" />
                </svg>
              )}
            >
              {whenPossible.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucune tâche libre.</div>
              ) : (
                whenPossible.map(task => <TaskItem key={task.id} task={task} />)
              )}
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}


