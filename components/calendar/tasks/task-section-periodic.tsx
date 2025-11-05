import { TaskWithShift } from '@/lib/calendar/calendar-utils';
import { TaskItemCompact } from '@/components/tasks/task-item-compact';
import { TASK_TYPE_STYLES } from '@/lib/tasks/task-constants';

type TaskSectionPeriodicProps = {
  tasks: TaskWithShift[];
  onUpdateTask: (formData: FormData) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSuccess?: () => void;
};

export function TaskSectionPeriodic({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onSuccess,
}: TaskSectionPeriodicProps) {
  if (tasks.length === 0) return null;

  return (
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
        Tâches périodiques
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskItemCompact
            key={task.id}
            task={task}
            className={TASK_TYPE_STYLES.periodic}
            onSubmit={onUpdateTask}
            onDelete={onDeleteTask}
            onSuccess={onSuccess}
          />
        ))}
      </div>
    </div>
  );
}

