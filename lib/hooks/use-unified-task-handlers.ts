import { 
  updateTodayTempTask, 
  deleteTodayTempTask 
} from "@/lib/storage/localStorage-tasks";

interface UseUnifiedTaskHandlersProps {
  onUpdateTask: (formData: FormData) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  loadTempTasks: () => void;
}

export function useUnifiedTaskHandlers({
  onUpdateTask,
  onDeleteTask,
  loadTempTasks,
}: UseUnifiedTaskHandlersProps) {
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

  return {
    handleUpdateTaskUnified,
    handleDeleteTaskUnified,
  };
}

