import { Task } from '@/lib/types';
import { TaskItemCompact } from '@/components/task-item-compact';
import { TASK_TYPE_STYLES } from '@/lib/task-constants';

type TaskSectionSpecificProps = {
  tasks: Task[];
  onUpdateTask: (formData: FormData) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSuccess?: () => void;
};

export function TaskSectionSpecific({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onSuccess,
}: TaskSectionSpecificProps) {
  if (tasks.length === 0) return null;

  return (
    <div>
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
        Tâches à date précise
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskItemCompact
            key={task.id}
            task={task}
            className={TASK_TYPE_STYLES.specific}
            onSubmit={onUpdateTask}
            onDelete={onDeleteTask}
            onSuccess={onSuccess}
          />
        ))}
      </div>
    </div>
  );
}

