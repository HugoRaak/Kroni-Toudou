"use client";

import { TaskWithType } from "@/lib/types";
import { DayTasksData } from "@/components/calendar/views/day-view";
import { TaskListDraggable } from "@/components/calendar/tasks/task-list-draggable";
import { TaskSectionWhenPossible } from "@/components/calendar/tasks/task-section-when-possible";
import { TaskSectionSpecific } from "@/components/calendar/tasks/task-section-specific";
import { DraggableTaskSection } from "@/components/calendar/tasks/draggable-task-section";
import type { ModeConflictError } from "@/app/actions/tasks";

interface SingleColumnLayoutProps {
  isTodayView: boolean;
  workMode: "Présentiel" | "Distanciel" | "Congé";
  tasks: DayTasksData;
  preparedTasks: TaskWithType[];
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onModeSaved?: () => void;
  handleUpdateTaskUnified: (formData: FormData) => Promise<boolean | ModeConflictError>;
  handleDeleteTaskUnified: (id: string) => Promise<boolean>;
  onHideTaskClick: (task: TaskWithType) => void;
  loadTempTasks: () => void;
}

export function SingleColumnLayout({
  isTodayView,
  workMode,
  tasks,
  preparedTasks,
  onUpdateTask,
  onDeleteTask,
  onModeSaved,
  handleUpdateTaskUnified,
  handleDeleteTaskUnified,
  onHideTaskClick,
  loadTempTasks,
}: SingleColumnLayoutProps) {
  if (!tasks) {
    return (
      <p className="text-center text-muted-foreground">
        {workMode === 'Congé' ? "Là c'est repos !" : 'Aucune tâche pour ce jour'}
      </p>
    );
  }

  if (isTodayView) {
    // Today view: merged list with drag & drop (including temp tasks) - single column
    return (
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
              onHide={onHideTaskClick}
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
    );
  }

  // Normal view: separated sections with edit order - single column
  return (
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
  );
}

