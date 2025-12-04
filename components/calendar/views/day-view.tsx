"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Task, TaskWithType } from "@/lib/types";
import { TaskWithShift, TaskShiftAlert } from "@/lib/calendar/calendar-utils";
import { WorkModeBadge } from "@/components/calendar/ui/workmode-badge";
import { TaskSectionSpecific } from "@/components/calendar/tasks/task-section-specific";
import { TaskSectionWhenPossible } from "@/components/calendar/tasks/task-section-when-possible";
import { DraggableTaskSection } from "@/components/calendar/tasks/draggable-task-section";
import { HideTaskDialog } from "@/components/calendar/dialogs/hide-task-dialog";
import { TaskListDraggable } from "@/components/calendar/tasks/task-list-draggable";
import { TaskColumnDraggable } from "@/components/calendar/tasks/task-column-draggable";
import { TaskItemCompact } from "@/components/tasks/task-item-compact";
import { taskWithTypeToTaskLike } from "@/lib/tasks/task-conversion";
import { getTaskTypeClassName } from "@/lib/tasks/task-constants";
import { isToday, getTodayHiddenTaskIds, hideTodayTask, hideTodayTempTask } from "@/lib/storage/localStorage-tasks";
import { storage } from "@/lib/storage/localStorage-helpers";
import { useTempTasks } from "@/lib/hooks/use-temp-tasks";
import { useUnifiedTaskHandlers } from "@/lib/hooks/use-unified-task-handlers";
import { prepareTasksForToday } from "@/lib/tasks/task-preparation";
import { formatDateLocal, normalizeToMidnight, isPastDate } from "@/lib/utils";
import type { ModeConflictError } from "@/app/actions/tasks";

export type DayTasksData = {
  periodic: TaskWithShift[];
  specific: Task[];
  whenPossible: {
    inProgress: Task[];
    notStarted: Task[];
  };
  alerts: TaskShiftAlert[];
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
  showNavigation = true,
}: {
  date: Date;
  loading: boolean;
  tasks: DayTasksData;
  workMode: "Présentiel" | "Distanciel" | "Congé";
  onPrev: () => void;
  onNext: () => void;
  onModeSaved?: () => void;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  showNavigation?: boolean;
}) {
  const day = useMemo(() => date.getDate(), [date]);
  const month = useMemo(() => {
    const monthStr = date.toLocaleDateString("fr-FR", { month: "long" });
    return monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
  }, [date]);
  const year = useMemo(() => date.getFullYear(), [date]);
  const dayName = useMemo(() => {
    const dayNameStr = date.toLocaleDateString("fr-FR", { weekday: "long" });
    return dayNameStr.charAt(0).toUpperCase() + dayNameStr.slice(1);
  }, [date]);
  const isTodayView = useMemo(() => isToday(date), [date]);
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false);
  const [taskToHide, setTaskToHide] = useState<TaskWithType | null>(null);
  const [layout, setLayout] = useState<'single' | 'three-column'>('single');

  // Load layout from localStorage after hydration to avoid SSR mismatch
  useEffect(() => {
    setLayout(storage.dayViewLayout.get());
  }, []);

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

  // Group preparedTasks by type for 3-column layout
  const groupedPreparedTasks = useMemo(() => {
    if (!isTodayView || layout !== 'three-column') return null;
    
    return {
      periodic: preparedTasks.filter(t => t.taskType === 'periodic'),
      specific: preparedTasks.filter(t => t.taskType === 'specific'),
      temp: preparedTasks.filter(t => t.taskType === 'temp'),
    };
  }, [preparedTasks, isTodayView, layout]);

  // Toggle layout
  const handleToggleLayout = () => {
    const newLayout = layout === 'single' ? 'three-column' : 'single';
    setLayout(newLayout);
    storage.dayViewLayout.set(newLayout);
  };

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
      <div className={`flex items-center ${showNavigation || isTodayView ? "justify-between" : "justify-center"}`}>
        {showNavigation && (
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
        )}
        {!showNavigation && isTodayView && <div />}
        <div className="text-center">
          {formatDateLocal(normalizeToMidnight(date)) === formatDateLocal(normalizeToMidnight(new Date())) && (
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
                onClick={handleToggleLayout}
                className="h-8 text-xs cursor-pointer"
                title={layout === 'single' ? 'Afficher en 3 colonnes' : 'Afficher en une colonne'}
              >
                {layout === 'single' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </Button>
            )}
            {showNavigation && (
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
          <p className="text-center text-muted-foreground">{workMode === 'Congé' ? "Là c'est repos !" : 'Aucune tâche pour ce jour'}</p>
        ) : layout === 'three-column' ? (
          // 3-column layout
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {isTodayView ? (
              // Today view: grouped by type
              <>
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-yellow-900 flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="text-yellow-700"
                    >
                      <circle cx="12" cy="12" r="10" strokeWidth="2" />
                      <path d="M12 6v6l4 2" strokeWidth="2" />
                    </svg>
                    Périodiques
                  </h3>
                  {groupedPreparedTasks && groupedPreparedTasks.periodic.length > 0 ? (
                    <TaskColumnDraggable
                      columnTasks={groupedPreparedTasks.periodic}
                      allTasks={preparedTasks}
                      onUpdate={handleUpdateTaskUnified}
                      onDelete={handleDeleteTaskUnified}
                      onHide={handleHideTaskClick}
                      onSuccess={() => {
                        loadTempTasks();
                        onModeSaved?.();
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune tâche périodique.</p>
                  )}
                </div>
                <div>
                  {workMode === 'Congé' && (
                    <p className="mb-3 text-center text-muted-foreground">Là c&apos;est repos !</p>
                  )}
                  <h3 className="mb-3 text-lg font-semibold text-violet-800 flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="text-violet-700"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                    </svg>
                    À date précise
                  </h3>
                  {groupedPreparedTasks && groupedPreparedTasks.specific.length > 0 ? (
                    <TaskColumnDraggable
                      columnTasks={groupedPreparedTasks.specific}
                      allTasks={preparedTasks}
                      onUpdate={handleUpdateTaskUnified}
                      onDelete={handleDeleteTaskUnified}
                      onHide={handleHideTaskClick}
                      onSuccess={() => {
                        loadTempTasks();
                        onModeSaved?.();
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune tâche à date précise.</p>
                  )}
                </div>
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-orange-800 flex items-center gap-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="text-orange-700"
                    >
                      <path
                        d="M12 5.5l1.6 3.7 3.7 1.6-3.7 1.6L12 16.1l-1.6-3.7L6.7 10.8l3.7-1.6L12 5.5z"
                        strokeWidth="2"
                      />
                    </svg>
                    Quand je peux
                  </h3>
                  {(groupedPreparedTasks && groupedPreparedTasks.temp.length > 0) || tasks.whenPossible.inProgress.length > 0 || tasks.whenPossible.notStarted.length > 0 ? (
                    <div className="space-y-2">
                      {groupedPreparedTasks && groupedPreparedTasks.temp.length > 0 && (
                        <TaskColumnDraggable
                          columnTasks={groupedPreparedTasks.temp}
                          allTasks={preparedTasks}
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
                        hideTitle={true}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune tâche libre.</p>
                  )}
                </div>
              </>
            ) : (
              // Normal day view: separated sections
              <>
                <div>
                  <DraggableTaskSection
                    title="Périodiques"
                    icon={(
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="text-yellow-700"
                      >
                        <circle cx="12" cy="12" r="10" strokeWidth="2" />
                        <path d="M12 6v6l4 2" strokeWidth="2" />
                      </svg>
                    )}
                    titleClassName="text-yellow-900"
                    tasks={tasks.periodic}
                    taskClassName="bg-yellow-50 border-yellow-400/30"
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onSuccess={onModeSaved}
                    accentColor="yellow"
                  />
                </div>
                <div>
                  {workMode === 'Congé' && (
                    <p className="mb-3 text-center text-muted-foreground">Là c&apos;est repos !</p>
                  )}
                  <TaskSectionSpecific
                    tasks={tasks.specific}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onSuccess={onModeSaved}
                  />
                </div>
                <div>
                  <DraggableTaskSection
                    title="Quand je peux"
                    icon={(
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="text-orange-700"
                      >
                        <path
                          d="M12 5.5l1.6 3.7 3.7 1.6-3.7 1.6L12 16.1l-1.6-3.7L6.7 10.8l3.7-1.6L12 5.5z"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                    titleClassName="text-orange-800"
                    tasks={[...tasks.whenPossible.inProgress, ...tasks.whenPossible.notStarted]}
                    taskClassName="bg-orange-50 border-orange-600/25"
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onSuccess={onModeSaved}
                    accentColor="orange"
                  />
                </div>
              </>
            )}
            {isTodayView && 
              workMode !== 'Congé' &&
              preparedTasks.length === 0 &&
              tasks.whenPossible.inProgress.length === 0 &&
              tasks.whenPossible.notStarted.length === 0 && (
                <div className="col-span-3">
                  <p className="text-center text-muted-foreground">Aucune tâche pour ce jour</p>
                </div>
              )}
            {!isTodayView &&
              workMode !== 'Congé' &&
              tasks.periodic.length === 0 &&
              tasks.specific.length === 0 &&
              tasks.whenPossible.inProgress.length === 0 &&
              tasks.whenPossible.notStarted.length === 0 && (
                <div className="col-span-3">
                  <p className="text-center text-muted-foreground">Aucune tâche pour ce jour</p>
                </div>
              )}
          </div>
        ) : isTodayView ? (
          // Today view: merged list with drag & drop (including temp tasks) - single column
          <div className="space-y-6">
            {workMode === 'Congé' && (
              <p className="text-center text-muted-foreground">Là c&apos;est repos !</p>
            )}
            {preparedTasks.length > 0 && (
              <div>
                <h2 className="mb-3 text-xl font-bold text-foreground flex items-center gap-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="text-yellow-500"
                  >
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="currentColor"
                    />
                  </svg>
                  Tâches du jour
                </h2>
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
              </div>
            )}

            <TaskSectionWhenPossible
              inProgress={tasks.whenPossible.inProgress}
              notStarted={tasks.whenPossible.notStarted}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onModeSaved}
            />

            {workMode !== 'Congé' &&
              preparedTasks.length === 0 &&
              tasks.whenPossible.inProgress.length === 0 &&
              tasks.whenPossible.notStarted.length === 0 && (
                <p className="text-center text-muted-foreground">Aucune tâche pour ce jour</p>
              )}
          </div>
        ) : (
          // Normal view: separated sections with edit order - single column
          <div className="space-y-6">
            <DraggableTaskSection
              title="Tâches périodiques"
              icon={(
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="text-yellow-700"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path d="M12 6v6l4 2" strokeWidth="2" />
                </svg>
              )}
              titleClassName="text-yellow-900"
              tasks={tasks.periodic}
              taskClassName="bg-yellow-50 border-yellow-400/30"
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onModeSaved}
              accentColor="yellow"
            />
            {workMode === 'Congé' && (
              <p className="mb-3 text-center text-muted-foreground">Là c&apos;est repos !</p>
            )}
            <TaskSectionSpecific
              tasks={tasks.specific}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onModeSaved}
            />
            <DraggableTaskSection
              title="Quand je peux"
              icon={(
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="text-orange-700"
                >
                  <path
                    d="M12 5.5l1.6 3.7 3.7 1.6-3.7 1.6L12 16.1l-1.6-3.7L6.7 10.8l3.7-1.6L12 5.5z"
                    strokeWidth="2"
                  />
                </svg>
              )}
              titleClassName="text-orange-800"
              tasks={[...tasks.whenPossible.inProgress, ...tasks.whenPossible.notStarted]}
              taskClassName="bg-orange-50 border-orange-600/25"
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onModeSaved}
              accentColor="orange"
            />
            {workMode !== 'Congé' &&
              tasks.periodic.length === 0 &&
              tasks.specific.length === 0 &&
              tasks.whenPossible.inProgress.length === 0 &&
              tasks.whenPossible.notStarted.length === 0 && (
                <p className="text-center text-muted-foreground">Aucune tâche pour ce jour</p>
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


