import { supabaseServerReadOnly } from '@/lib/supabase/supabase-server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { 
  updateTaskFromFormAction, 
  deleteTaskActionWrapper, 
  createTaskFromFormAction 
} from '@/app/actions/tasks';
import { LicenseProcessor } from '@/components/license-processor';
import { CalendarWithAddButton } from '@/components/calendar/ui/calendar-with-add-button';

export default async function Home() {
  const supabase = await supabaseServerReadOnly();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <LicenseProcessor />
      <Navbar user={user} />
      <main className="container mx-auto px-4 pt-4 pb-8">
        <CalendarWithAddButton
          userId={user.id}
          onUpdateTask={updateTaskFromFormAction}
          onDeleteTask={deleteTaskActionWrapper}
          onSubmit={createTaskFromFormAction}
        />
      </main>
    </div>
  );
}
