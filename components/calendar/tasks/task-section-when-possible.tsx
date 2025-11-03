import { Task } from '@/lib/types';
import { TaskItemCompact } from '@/components/tasks/task-item-compact';
import { TASK_TYPE_STYLES } from '@/lib/tasks/task-constants';

type TaskSectionWhenPossibleProps = {
  inProgress: Task[];
  notStarted: Task[];
  onUpdateTask: (formData: FormData) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSuccess?: () => void;
};

export function TaskSectionWhenPossible({
  inProgress,
  notStarted,
  onUpdateTask,
  onDeleteTask,
  onSuccess,
}: TaskSectionWhenPossibleProps) {
  if (inProgress.length === 0 && notStarted.length === 0) return null;

  return (
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

      {inProgress.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">
            En cours ({inProgress.length})
          </h4>
          <div className="space-y-2">
            {inProgress.map((task) => (
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

      {notStarted.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-foreground">
            Pas encore commencées ({notStarted.length})
          </h4>
          <div className="space-y-2">
            {notStarted.map((task) => (
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
  );
}

