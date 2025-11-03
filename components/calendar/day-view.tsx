"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Task } from "@/lib/types";
import { TaskItemCompact } from "@/components/task-item-compact";
import { WorkModeBadge } from "@/components/calendar/workmode-badge";
import { TaskSectionPeriodic } from "@/components/calendar/task-section-periodic";
import { TaskSectionSpecific } from "@/components/calendar/task-section-specific";
import { TaskSectionWhenPossible } from "@/components/calendar/task-section-when-possible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { isToday, getTodayTaskOrder, saveTodayTaskOrder, getTodayHiddenTaskIds, hideTodayTask, updateTodayTempTask, deleteTodayTempTask, hideTodayTempTask, TempTask } from "@/lib/localStorage-tasks";
import { useTempTasks } from "@/lib/hooks/use-temp-tasks";
import { useDragAndDrop } from "@/lib/hooks/use-drag-and-drop";
import { getTaskTypeClassName } from "@/lib/task-constants";

export type DayTasksData = {
  periodic: Task[];
  specific: Task[];
  whenPossible: {
    inProgress: Task[];
    notStarted: Task[];
  };
} | null;

type TaskWithType = (Task & { taskType: 'periodic' | 'specific' | 'temp' }) | (TempTask & { taskType: 'temp' });

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

  // Prepare ordered tasks for today view (including temp tasks)
  const prepareTasks = (): TaskWithType[] => {
    if (!tasks || !isTodayView || loading) return [];

    // Merge periodic, specific, and temp tasks with their types
    const allTasks: TaskWithType[] = [
      ...tasks.periodic.map(t => ({ ...t, taskType: 'periodic' as const })),
      ...tasks.specific.map(t => ({ ...t, taskType: 'specific' as const })),
      ...tempTasks.map(t => ({ ...t, taskType: 'temp' as const })),
    ];

    // Filter out hidden tasks
    const hiddenIds = getTodayHiddenTaskIds();
    const hiddenTempTaskIds = getHiddenTempTaskIds();
    const allHiddenIds = [...hiddenIds, ...hiddenTempTaskIds];
    const visibleTasks = allTasks.filter(t => !allHiddenIds.includes(t.id));

    // Get saved order from localStorage
    const savedOrder = getTodayTaskOrder();
    
    if (savedOrder.length > 0) {
      // Sort by saved order
      const ordered = savedOrder
        .map(id => visibleTasks.find(t => t.id === id))
        .filter((t): t is TaskWithType => t !== undefined);
      
      // Add any new tasks not in the saved order at the end
      const orderedIds = new Set(ordered.map(t => t.id));
      const newTasks = visibleTasks.filter(t => !orderedIds.has(t.id));
      
      return [...ordered, ...newTasks];
    } else {
      // No saved order, use default order
      if (visibleTasks.length > 0) {
        saveTodayTaskOrder(visibleTasks.map(t => t.id));
      }
      return visibleTasks;
    }
  };

  const initialTasks = prepareTasks();
  const {
    items: orderedTasks,
    setItems: setOrderedTasks,
    draggedIndex,
    dragOverIndex,
    dropPosition,
    handleDragStart,
    handleDropZoneDragOver,
    handleDropZoneDrop,
    handleTaskDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useDragAndDrop<TaskWithType>(initialTasks);

  // Update ordered tasks when tasks or tempTasks change
  useEffect(() => {
    const newTasks = prepareTasks();
    setOrderedTasks(newTasks);
  }, [tasks, tempTasks, loading, isTodayView]);


  // Convert task to Task-like object for TaskItemCompact
  const taskToTaskLike = (task: TaskWithType): Partial<Task> & { id: string; title: string; description: string } => {
    if (task.taskType === 'temp') {
      const tempTask = task as TempTask & { taskType: 'temp' };
      return {
        id: tempTask.id,
        title: tempTask.title,
        description: tempTask.description,
        mode: tempTask.mode,
        in_progress: tempTask.in_progress,
        created_at: tempTask.created_at,
        updated_at: tempTask.created_at,
      };
    }
    return task as Task & { taskType: 'periodic' | 'specific' };
  };

  // Handler for updating tasks (regular or temp)
  const handleUpdateTaskUnified = async (formData: FormData): Promise<boolean> => {
    const id = String(formData.get('id') || '');
    const isTempTask = id.startsWith('temp-');
    
    if (isTempTask) {
      // Update temp task in localStorage
      const title = String(formData.get('title') || '');
      const description = String(formData.get('description') || '');
      
      const updated = updateTodayTempTask(id, { title, description });
      if (updated) {
        loadTempTasks();
        window.dispatchEvent(new Event('temp-task-updated'));
        return true;
      }
      return false;
    } else {
      // Update regular task (goes to DB)
      return await onUpdateTask(formData);
    }
  };

  // Handler for deleting tasks (regular or temp)
  const handleDeleteTaskUnified = async (id: string): Promise<boolean> => {
    const isTempTask = id.startsWith('temp-');
    
    if (isTempTask) {
      const result = deleteTodayTempTask(id);
      if (result) {
        loadTempTasks();
        window.dispatchEvent(new Event('temp-task-updated'));
        return true;
      }
      return false;
    } else {
      return await onDeleteTask(id);
    }
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
      // Update local state to remove hidden task
      setOrderedTasks(orderedTasks.filter(t => t.id !== taskToHide.id));
      setHideConfirmOpen(false);
      setTaskToHide(null);
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
          <p className="text-center text-muted-foreground">{workMode === 'Congé' ? 'Là c\'est repos !' : 'Aucune tâche pour ce jour'}</p>
        ) : isTodayView ? (
          // Today view: merged list with drag & drop (including temp tasks)
          <div className="space-y-6">
            {orderedTasks.length > 0 && (
              <div className="space-y-2">
                {orderedTasks.map((task, index) => (
                  <div key={task.id} className="relative">
                    {/* Drop zone before task - invisible but functional, overlaps with previous task */}
                    <div
                      onDragOver={(e) => handleDropZoneDragOver(e, index, 'before')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropZoneDrop(e, index, 'before')}
                      className={`absolute top-0 left-0 right-0 h-3 z-10 transition-all pointer-events-none ${
                        draggedIndex !== null ? 'pointer-events-auto' : ''
                      } ${
                        dragOverIndex === index && dropPosition === 'before' && draggedIndex !== null && draggedIndex !== index
                          ? 'bg-blue-500/15 border-t-2 border-dashed border-blue-500/60 h-6 -mt-1.5' 
                          : ''
                      }`}
                    />
                    
                    {/* Task item */}
                    <div
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleTaskDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative group transition-all duration-200 ${
                        draggedIndex === index 
                          ? 'z-50 cursor-grabbing' 
                          : 'cursor-move hover:opacity-90 z-0'
                      }`}
                    >
                      <div className="relative">
                        <TaskItemCompact 
                          task={taskToTaskLike(task)} 
                          className={`transition-all ${
                            draggedIndex === index 
                              ? 'shadow-2xl scale-105 ring-4 ring-blue-500/40 ring-offset-2 bg-background border-2 border-blue-500/60' 
                              : ''
                          } ${getTaskTypeClassName(task.taskType)}`}
                          onSubmit={handleUpdateTaskUnified}
                          onDelete={handleDeleteTaskUnified}
                          onSuccess={() => {
                            loadTempTasks();
                            onModeSaved?.();
                          }}
                        />
                        {/* Hide button - always visible */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHideTaskClick(task);
                          }}
                          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 hover:bg-muted/50 transition-colors cursor-pointer z-30"
                          title="Fini de faire cette tâche"
                        >
                          <svg className="w-5 h-5 text-muted-foreground hover:text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                      {dragOverIndex === index && dropPosition === 'before' && draggedIndex !== null && draggedIndex !== index && (
                        <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-500/70 rounded-full z-20" />
                      )}
                      {dragOverIndex === index && dropPosition === 'after' && draggedIndex !== null && draggedIndex !== index && (
                        <div className="absolute -bottom-2 left-0 right-0 h-1 bg-blue-500/70 rounded-full z-20" />
                      )}
                    </div>
                    
                    {/* Drop zone after task - invisible but functional, overlaps with next task */}
                    <div
                      onDragOver={(e) => handleDropZoneDragOver(e, index, 'after')}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropZoneDrop(e, index, 'after')}
                      className={`absolute bottom-0 left-0 right-0 h-3 z-10 transition-all pointer-events-none ${
                        draggedIndex !== null ? 'pointer-events-auto' : ''
                      } ${
                        dragOverIndex === index && dropPosition === 'after' && draggedIndex !== null && draggedIndex !== index
                          ? 'bg-blue-500/15 border-b-2 border-dashed border-blue-500/60 h-6 -mb-1.5' 
                          : ''
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}

            <TaskSectionWhenPossible
              inProgress={tasks.whenPossible.inProgress}
              notStarted={tasks.whenPossible.notStarted}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onSuccess={onModeSaved}
            />

            {orderedTasks.length === 0 &&
              tasks.whenPossible.inProgress.length === 0 &&
              tasks.whenPossible.notStarted.length === 0 && (
                <p className="text-center text-muted-foreground">{workMode === 'Congé' ? 'Là c\'est repos !' : 'Aucune tâche pour ce jour'}</p>
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
                <p className="text-center text-muted-foreground">{workMode === 'Congé' ? 'Là c\'est repos !' : 'Aucune tâche pour ce jour'}</p>
              )}
          </div>
        )}
      </div>

      {/* Confirmation dialog for hiding task */}
      <Dialog open={hideConfirmOpen} onOpenChange={setHideConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 mb-4">
              <DialogTitle className="text-center">C'est bon c'est fini ?</DialogTitle>
              <Image 
                src="/kroni-impatient.png" 
                alt="Kroni impatient" 
                width={80} 
                height={80} 
                className="rounded-md"
              />
              <DialogDescription className="text-center">
                Êtes-vous sûr d'avoir bien fini la tâche <strong>"{taskToHide?.title}"</strong> ?<br />
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full sm:w-auto cursor-pointer"
              >
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="w-full sm:w-auto cursor-pointer bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirmHide}
            >
              Finis !
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DayView;


