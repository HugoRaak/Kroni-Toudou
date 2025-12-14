import { supabaseServerReadOnly } from '@/lib/supabase/supabase-server';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import {
  updateTaskFromFormAction,
  deleteTaskActionWrapper,
  createTaskFromFormAction,
} from '@/app/actions/tasks';
import { LicenseProcessor } from '@/components/license-processor';
import { CalendarWithAddButton } from '@/components/calendar/ui/calendar-with-add-button';
import { getTasksForDay } from '@/lib/calendar/calendar-utils';
import { getWorkday } from '@/lib/db/workdays';
import { normalizeToMidnight, formatDateLocal } from '@/lib/utils';

export default async function Home() {
  const supabase = await supabaseServerReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Preload today's data server-side for faster initial render
  const today = normalizeToMidnight(new Date());
  const todayStr = formatDateLocal(today);
  const [initialDayData, initialWorkMode] = await Promise.all([
    getTasksForDay(user.id, today),
    getWorkday(user.id, todayStr),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <LicenseProcessor />
      <Navbar user={user} />
      <main className="container mx-auto px-4 pt-4 pb-8">
        <CalendarWithAddButton
          userId={user.id}
          initialDayData={initialDayData}
          initialWorkMode={initialWorkMode}
          initialDayDate={today}
          onUpdateTask={updateTaskFromFormAction}
          onDeleteTask={deleteTaskActionWrapper}
          onSubmit={createTaskFromFormAction}
        />
      </main>
    </div>
  );
}
