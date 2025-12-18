'use client';

import { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Task } from '@/lib/types';
import { TaskWithShift, TaskShiftAlert } from '@/lib/calendar/calendar-utils';
import { WorkModeBadge } from '@/components/calendar/ui/workmode-badge';
import { HideTaskDialog } from '@/components/calendar/dialogs/hide-task-dialog';
import { SingleColumnLayout } from './day-view-layouts/single-column-layout';
import { ThreeColumnLayout } from './day-view-layouts/three-column-layout';
import { isToday, hideTodayTask, hideTodayTempTask } from '@/lib/storage/localStorage-tasks';
import { useTempTasks } from '@/lib/hooks/tasks/use-temp-tasks';
import { useUnifiedTaskHandlers } from '@/lib/hooks/tasks/use-unified-task-handlers';
import { useDayViewState } from '@/lib/hooks/calendar/use-day-view-state';
import { useDayTasksPreparation } from '@/lib/hooks/calendar/use-day-tasks-preparation';
import { formatDateLocal, normalizeToMidnight, isPastDate } from '@/lib/utils';
import type { ModeConflictError } from '@/app/actions/tasks';

export type DayTasksData = {
  periodic: TaskWithShift[];
  specific: Task[];
  whenPossible: {
    inProgress: Task[];
    notStarted: Task[];
  };
  alerts: TaskShiftAlert[];
} | null;

function DayView({
  date,
  loading,
  tasks,
  workMode,
  onPrev,
  onNext,
  onModeSaved,
  onUpdateTask,
  onDeleteTask,
  showNavigation = true,
}: {
  date: Date;
  loading: boolean;
  tasks: DayTasksData;
  workMode: 'Présentiel' | 'Distanciel' | 'Congé';
  onPrev: () => void;
  onNext: () => void;
  onModeSaved?: () => void;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  showNavigation?: boolean;
}) {
  const day = useMemo(() => date.getDate(), [date]);
  const month = useMemo(() => {
    const monthStr = date.toLocaleDateString('fr-FR', { month: 'long' });
    return monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
  }, [date]);
  const year = useMemo(() => date.getFullYear(), [date]);
  const dayName = useMemo(() => {
    const dayNameStr = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return dayNameStr.charAt(0).toUpperCase() + dayNameStr.slice(1);
  }, [date]);
  const isTodayView = useMemo(() => isToday(date), [date]);

  // Use day view state hook
  const state = useDayViewState(isTodayView);

  // Use temp tasks hook
  const { tempTasks, loadTempTasks, getHiddenTempTaskIds } = useTempTasks(isTodayView, workMode);

  // Memoize loadTempTasks to avoid recreating handler
  const loadTempTasksMemo = useCallback(() => {
    loadTempTasks();
  }, [loadTempTasks]);

  // Use unified task handlers
  const { handleUpdateTaskUnified, handleDeleteTaskUnified } = useUnifiedTaskHandlers({
    onUpdateTask,
    onDeleteTask,
    loadTempTasks: loadTempTasksMemo,
  });

  // Use day tasks preparation hook
  const { preparedTasks, groupedPreparedTasks } = useDayTasksPreparation(
    tasks,
    tempTasks,
    isTodayView,
    loading,
    state.orderVersion,
    getHiddenTempTaskIds,
    state.layout,
  );

  // Handler for hiding/finishing tasks (regular or temp)
  const handleConfirmHide = useCallback(() => {
    const { taskToHide, handleConfirmHide: confirmHide } = state;
    if (taskToHide) {
      if (taskToHide.id.startsWith('temp-')) {
        // Hide temp task
        hideTodayTempTask(taskToHide.id);
        loadTempTasks();
      } else {
        // Hide regular task
        hideTodayTask(taskToHide.id);
      }
      confirmHide();
      onModeSaved?.();
    }
  }, [state, loadTempTasks, onModeSaved]);

  return (
    <div className="space-y-4">
      <div
        className={`flex items-center ${showNavigation || isTodayView ? 'justify-between' : 'justify-center'}`}
      >
        {showNavigation && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            data-testid="day-prev"
            className="cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
        )}
        {!showNavigation && isTodayView && <div />}
        <div className="text-center">
          {formatDateLocal(normalizeToMidnight(date)) ===
            formatDateLocal(normalizeToMidnight(new Date())) && (
            <span className="inline-block mb-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Aujourd&apos;hui
            </span>
          )}
          <h2 className="text-2xl font-bold text-foreground">{dayName}</h2>
          <p className="text-lg text-muted-foreground">
            {day} {month} {year}
          </p>
          {!loading && (
            <div className="mt-2 flex items-center justify-center">
              <WorkModeBadge
                workMode={workMode}
                date={date}
                onSaved={onModeSaved}
                disabled={loading || isPastDate(date)}
              />
            </div>
          )}
        </div>
        {(showNavigation || isTodayView) && (
          <div className="flex items-center gap-2">
            {(isTodayView || showNavigation) && (
              <Button
                variant="outline"
                size="sm"
                onClick={state.handleToggleLayout}
                className="h-8 text-xs cursor-pointer"
                title={
                  state.layout === 'single' ? 'Afficher en 3 colonnes' : 'Afficher en une colonne'
                }
              >
                {state.layout === 'single' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </Button>
            )}
            {showNavigation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNext}
                data-testid="day-next"
                className="cursor-pointer hover:bg-primary/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="min-h-[400px] rounded-lg border border-border bg-card p-6">
        {loading ? (
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="space-y-2">
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-2/3" />
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            </div>

            <div>
              <Skeleton className="mb-3 h-5 w-40" />
              <div className="space-y-2">
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-2/3" />
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            </div>

            <div>
              <Skeleton className="mb-3 h-5 w-48" />
              <div className="space-y-2">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-2/3" />
                </div>
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        ) : !tasks ? (
          <p className="text-center text-muted-foreground">Aucune tâche pour ce jour</p>
        ) : state.layout === 'three-column' ? (
          <ThreeColumnLayout
            isTodayView={isTodayView}
            workMode={workMode}
            tasks={tasks}
            preparedTasks={preparedTasks}
            groupedPreparedTasks={groupedPreparedTasks}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onModeSaved={onModeSaved}
            handleUpdateTaskUnified={handleUpdateTaskUnified}
            handleDeleteTaskUnified={handleDeleteTaskUnified}
            onHideTaskClick={state.handleHideTaskClick}
            loadTempTasks={loadTempTasks}
          />
        ) : (
          <SingleColumnLayout
            isTodayView={isTodayView}
            workMode={workMode}
            tasks={tasks}
            preparedTasks={preparedTasks}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onModeSaved={onModeSaved}
            handleUpdateTaskUnified={handleUpdateTaskUnified}
            handleDeleteTaskUnified={handleDeleteTaskUnified}
            onHideTaskClick={state.handleHideTaskClick}
            loadTempTasks={loadTempTasks}
          />
        )}
      </div>

      <HideTaskDialog
        open={state.hideConfirmOpen}
        task={state.taskToHide}
        onConfirm={handleConfirmHide}
        onCancel={state.handleCancelHide}
      />
    </div>
  );
}

export default DayView;
