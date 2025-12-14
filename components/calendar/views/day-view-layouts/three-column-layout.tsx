'use client';

import { TaskWithType } from '@/lib/types';
import { DayTasksData } from '@/components/calendar/views/day-view';
import { TaskColumnDraggable } from '@/components/calendar/tasks/task-column-draggable';
import { TaskSectionWhenPossible } from '@/components/calendar/tasks/task-section-when-possible';
import { DraggableTaskSection } from '@/components/calendar/tasks/draggable-task-section';
import { TaskSectionSpecific } from '@/components/calendar/tasks/task-section-specific';
import type { ModeConflictError } from '@/app/actions/tasks';

interface ThreeColumnLayoutProps {
  isTodayView: boolean;
  workMode: 'Présentiel' | 'Distanciel' | 'Congé';
  tasks: DayTasksData;
  preparedTasks: TaskWithType[];
  groupedPreparedTasks: {
    periodic: TaskWithType[];
    specific: TaskWithType[];
    temp: TaskWithType[];
  } | null;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onModeSaved?: () => void;
  handleUpdateTaskUnified: (formData: FormData) => Promise<boolean | ModeConflictError>;
  handleDeleteTaskUnified: (id: string) => Promise<boolean>;
  onHideTaskClick: (task: TaskWithType) => void;
  loadTempTasks: () => void;
}

export function ThreeColumnLayout({
  isTodayView,
  workMode,
  tasks,
  preparedTasks,
  groupedPreparedTasks,
  onUpdateTask,
  onDeleteTask,
  onModeSaved,
  handleUpdateTaskUnified,
  handleDeleteTaskUnified,
  onHideTaskClick,
  loadTempTasks,
}: ThreeColumnLayoutProps) {
  if (!tasks) {
    return (
      <p className="text-center text-muted-foreground">
        {workMode === 'Congé' ? "Là c'est repos !" : 'Aucune tâche pour ce jour'}
      </p>
    );
  }

  return (
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
                onHide={onHideTaskClick}
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
                onHide={onHideTaskClick}
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
            {tasks.whenPossible.inProgress.length > 0 ||
            tasks.whenPossible.notStarted.length > 0 ? (
              <TaskSectionWhenPossible
                inProgress={tasks.whenPossible.inProgress}
                notStarted={tasks.whenPossible.notStarted}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onSuccess={onModeSaved}
                hideTitle={true}
              />
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
              icon={
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
              }
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
              icon={
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
              }
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
  );
}
