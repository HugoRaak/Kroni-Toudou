'use client';

import { Task } from '@/lib/types';
import { TaskItemCompact } from '@/components/tasks/items/task-item-compact';
import { TASK_TYPE_STYLES } from '@/lib/tasks/constants/task-constants';
import type { ModeConflictError } from '@/app/actions/tasks';
import { groupInProgressTasksByDueDate } from '@/lib/tasks/processing/task-filtering';
import { parseDateLocal } from '@/lib/utils';

type TaskSectionWhenPossibleProps = {
  inProgress: Task[];
  notStarted: Task[];
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSuccess?: () => void;
  hideTitle?: boolean;
};

function formatDateDisplay(dateStr: string): string {
  const date = parseDateLocal(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function TaskSectionWhenPossible({
  inProgress,
  notStarted,
  onUpdateTask,
  onDeleteTask,
  onSuccess,
  hideTitle = false,
}: TaskSectionWhenPossibleProps) {
  if (inProgress.length === 0 && notStarted.length === 0) return null;

  const { upcoming, overdue, noDue } = groupInProgressTasksByDueDate(inProgress);

  return (
    <div>
      {!hideTitle && (
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
      )}

      {inProgress.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-medium text-foreground">
            En cours ({inProgress.length})
          </h4>
          <div className="space-y-5">
            {overdue.length > 0 && (
              <div className="rounded-lg border-2 border-red-400/70 bg-red-100/90 p-3">
                <h5 className="mb-3 text-xs font-semibold text-red-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-700"></span>
                  Échéance dépassée ({overdue.length})
                </h5>
                <div className="space-y-2">
                  {overdue.map((task) => (
                    <div key={task.id}>
                      <TaskItemCompact
                        task={task}
                        className={TASK_TYPE_STYLES.whenPossible}
                        onSubmit={onUpdateTask}
                        onDelete={onDeleteTask}
                        onSuccess={onSuccess}
                      />
                      {task.due_on && (
                        <div className="text-xs text-muted-foreground mt-1 ml-3">
                          {formatDateDisplay(task.due_on)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="rounded-lg border-2 border-amber-400/70 bg-amber-100/90 p-3">
                <h5 className="mb-3 text-xs font-semibold text-amber-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                  Avec échéance à venir ({upcoming.length})
                </h5>
                <div className="space-y-2">
                  {upcoming.map((task) => (
                    <div key={task.id}>
                      <TaskItemCompact
                        task={task}
                        className={TASK_TYPE_STYLES.whenPossible}
                        onSubmit={onUpdateTask}
                        onDelete={onDeleteTask}
                        onSuccess={onSuccess}
                      />
                      {task.due_on && (
                        <div className="text-xs text-muted-foreground mt-1 ml-3">
                          {formatDateDisplay(task.due_on)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {noDue.length > 0 && (
              <div className="rounded-lg border-2 border-orange-400/70 bg-orange-100/90 p-3">
                <h5 className="mb-3 text-xs font-semibold text-orange-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-600"></span>
                  Sans échéance ({noDue.length})
                </h5>
                <div className="space-y-2">
                  {noDue.map((task) => (
                    <TaskItemCompact
                      key={task.id}
                      task={task}
                      className={TASK_TYPE_STYLES.whenPossible}
                      onSubmit={onUpdateTask}
                      onDelete={onDeleteTask}
                      onSuccess={onSuccess}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {notStarted.length > 0 && (
        <div className="rounded-lg border-2 border-slate-400/70 bg-slate-100/90 p-3">
          <h4 className="mb-3 text-sm font-semibold text-slate-800 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
            Pas encore commencées ({notStarted.length})
          </h4>
          <div className="space-y-2">
            {notStarted.map((task) => (
              <div key={task.id}>
                <TaskItemCompact
                  task={task}
                  className={TASK_TYPE_STYLES.whenPossible}
                  onSubmit={onUpdateTask}
                  onDelete={onDeleteTask}
                  onSuccess={onSuccess}
                />
                {task.due_on && (
                  <div className="text-xs text-muted-foreground mt-1 ml-3">
                    {formatDateDisplay(task.due_on)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
