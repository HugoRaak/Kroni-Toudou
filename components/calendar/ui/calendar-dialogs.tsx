'use client';

import { DayTasksDialog } from '@/components/calendar/dialogs/day-tasks-dialog';
import { WorkModeConflictDialog } from '@/components/calendar/workmode-conflict-dialog';
import {
  CalendarTask,
  getTasksForDate,
  filterTasksByWorkMode,
} from '@/lib/calendar/calendar-utils';
import { formatDateLocal } from '@/lib/utils';
import type { ModeConflictError } from '@/app/actions/tasks';
import type { ModeConflict } from '@/lib/hooks/workdays/use-mode-conflicts';

type CalendarDialogsProps = {
  selectedDate: Date | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  tasks: CalendarTask[];
  workdays: Record<string, 'Présentiel' | 'Distanciel' | 'Congé'>;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSaved: () => void;
  modeConflict: ModeConflict | null;
  modeConflicts: ModeConflict[];
  userId: string | null;
  currentConflictIndex: number;
  totalConflicts: number;
  handleDateChange: (taskId: string, newDate: string) => Promise<void>;
  handleCancelConflict: () => void;
  handleConfirmAnyway: () => void;
  handleConflictResolved: () => void;
};

export function CalendarDialogs({
  selectedDate,
  dialogOpen,
  setDialogOpen,
  tasks,
  workdays,
  onUpdateTask,
  onDeleteTask,
  onSaved,
  modeConflict,
  modeConflicts,
  userId,
  currentConflictIndex,
  totalConflicts,
  handleDateChange,
  handleCancelConflict,
  handleConfirmAnyway,
  handleConflictResolved,
}: CalendarDialogsProps) {
  return (
    <>
      {selectedDate && (
        <DayTasksDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={selectedDate}
          tasks={filterTasksByWorkMode(
            getTasksForDate(tasks, selectedDate),
            workdays[formatDateLocal(selectedDate)] ?? 'Présentiel',
          )}
          workMode={workdays[formatDateLocal(selectedDate)] ?? 'Présentiel'}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onSaved={onSaved}
        />
      )}
      {modeConflict && userId && (
        <WorkModeConflictDialog
          open={!!modeConflict}
          onOpenChange={(open) => !open && handleCancelConflict()}
          conflict={modeConflict.conflict}
          modeConflicts={modeConflicts}
          userId={userId}
          onDateChange={handleDateChange}
          onCancel={handleCancelConflict}
          onConfirm={handleConfirmAnyway}
          onConflictResolved={handleConflictResolved}
          conflictIndex={currentConflictIndex}
          totalConflicts={totalConflicts}
        />
      )}
    </>
  );
}
