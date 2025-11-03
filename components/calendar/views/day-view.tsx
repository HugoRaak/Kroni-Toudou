"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Task, TaskWithType } from "@/lib/types";
import { WorkModeBadge } from "@/components/calendar/ui/workmode-badge";
import { TaskSectionPeriodic } from "@/components/calendar/tasks/task-section-periodic";
import { TaskSectionSpecific } from "@/components/calendar/tasks/task-section-specific";
import { TaskSectionWhenPossible } from "@/components/calendar/tasks/task-section-when-possible";
import { HideTaskDialog } from "@/components/calendar/dialogs/hide-task-dialog";
import { TaskListDraggable } from "@/components/calendar/tasks/task-list-draggable";
import { isToday, getTodayHiddenTaskIds, hideTodayTask, hideTodayTempTask } from "@/lib/storage/localStorage-tasks";
import { useTempTasks } from "@/lib/hooks/use-temp-tasks";
import { useUnifiedTaskHandlers } from "@/lib/hooks/use-unified-task-handlers";
import { prepareTasksForToday } from "@/lib/tasks/task-preparation";

export type DayTasksData = {
  periodic: Task[];
  specific: Task[];
  whenPossible: {
    inProgress: Task[];
    notStarted: Task[];
  };
} | null;

export function DayView({
  date,
  loading,
  tasks,
  workMode,
  onPrev,
  onNext,
  onModeSaved,
  onUpdateTask,
  onDeleteTask,
}: {
  date: Date;
  loading: boolean;
  tasks: DayTasksData;
  workMode: "Présentiel" | "Distanciel" | "Congé";
  onPrev: () => void;
  onNext: () => void;
  onModeSaved?: () => void;
  onUpdateTask: (formData: FormData) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
}) {
  const day = date.getDate();
  const month = date.toLocaleDateString("fr-FR", { month: "long" });
  const year = date.getFullYear();
  const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });
  const isTodayView = isToday(date);
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false);
  const [taskToHide, setTaskToHide] = useState<TaskWithType | null>(null);

  // Use temp tasks hook
  const { tempTasks, loadTempTasks, getHiddenTempTaskIds } = useTempTasks(isTodayView, workMode);

  // Use unified task handlers
  const { handleUpdateTaskUnified, handleDeleteTaskUnified } = useUnifiedTaskHandlers({
    onUpdateTask,
    onDeleteTask,
    loadTempTasks,
  });

  // Track order updates to force recalculation
  const [orderVersion, setOrderVersion] = useState(0);

  // Listen for order updates from drag & drop
  useEffect(() => {
    if (!isTodayView) return;
    
    const handler = () => {
      setOrderVersion(v => v + 1);
    };
    window.addEventListener('task-order-updated', handler);
    return () => window.removeEventListener('task-order-updated', handler);
  }, [isTodayView]);

  // Prepare ordered tasks for today view (including temp tasks)
  const preparedTasks = useMemo(() => {
    const hiddenIds = getTodayHiddenTaskIds();
    const hiddenTempTaskIds = getHiddenTempTaskIds();
    return prepareTasksForToday(
      tasks,
      tempTasks,
      hiddenIds,
      hiddenTempTaskIds,
      isTodayView,
      loading
    );
  }, [tasks, tempTasks, loading, isTodayView, orderVersion]);

  // Handler for hiding/finishing tasks (regular or temp)
  const handleHideTaskClick = (task: TaskWithType) => {
    setTaskToHide(task);
    setHideConfirmOpen(true);
  };

  const handleConfirmHide = () => {
    if (taskToHide) {
      if (taskToHide.id.startsWith('temp-')) {
        // Hide temp task
        hideTodayTempTask(taskToHide.id);
        loadTempTasks();
      } else {
        // Hide regular task
        hideTodayTask(taskToHide.id);
      }
      setHideConfirmOpen(false);
      setTaskToHide(null);
      onModeSaved?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className="cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div className="text-center">
          {date.toDateString() === new Date().toDateString() && (
            <span className="inline-block mb-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Aujourd'hui
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
                disabled={loading}
              />
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          className="cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
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
          <p className="text-center text-muted-foreground">{workMode === 'Congé' ? 'Là c&apos;est repos !' : 'Aucune tâche pour ce jour'}</p>
        ) : isTodayView ? (
          // Today view: merged list with drag & drop (including temp tasks)
          <div className="space-y-6">
            {preparedTasks.length > 0 && (
              <TaskListDraggable
                tasks={preparedTasks}
                onUpdate={handleUpdateTaskUnified}
                onDelete={handleDeleteTaskUnified}
                onHide={handleHideTaskClick}
                onSuccess={() => {
                  loadTempTasks();
                  onModeSaved?.();
                }}
              />
            )}

            <TaskSectionWhenPossible
              inProgress={tasks.whenPossible.inProgress}
              notStarted={tasks.whenPossible.notStarted}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onModeSaved}
            />

            {preparedTasks.length === 0 &&
              tasks.whenPossible.inProgress.length === 0 &&
              tasks.whenPossible.notStarted.length === 0 && (
                <p className="text-center text-muted-foreground">{workMode === 'Congé' ? 'Là c&apos;est repos !' : 'Aucune tâche pour ce jour'}</p>
              )}
          </div>
        ) : (
          // Normal view: separated sections
          <div className="space-y-6">
            <TaskSectionPeriodic
              tasks={tasks.periodic}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onModeSaved}
            />
            <TaskSectionSpecific
              tasks={tasks.specific}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onModeSaved}
            />
            <TaskSectionWhenPossible
              inProgress={tasks.whenPossible.inProgress}
              notStarted={tasks.whenPossible.notStarted}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onModeSaved}
            />
            {tasks.periodic.length === 0 &&
              tasks.specific.length === 0 &&
              tasks.whenPossible.inProgress.length === 0 &&
              tasks.whenPossible.notStarted.length === 0 && (
                <p className="text-center text-muted-foreground">{workMode === 'Congé' ? 'Là c&apos;est repos !' : 'Aucune tâche pour ce jour'}</p>
              )}
          </div>
        )}
      </div>

      <HideTaskDialog
        open={hideConfirmOpen}
        task={taskToHide}
        onConfirm={handleConfirmHide}
        onCancel={() => {
          setHideConfirmOpen(false);
          setTaskToHide(null);
        }}
      />
    </div>
  );
}

export default DayView;


