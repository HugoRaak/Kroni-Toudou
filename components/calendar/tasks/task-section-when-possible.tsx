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
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">
            En cours ({inProgress.length})
          </h4>
          <div className="space-y-4">
            {overdue.length > 0 && (
              <div>
                <h5 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
              <div>
                <h5 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
              <div>
                <h5 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
        <div>
          <h4 className="mb-2 text-sm font-medium text-foreground">
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
