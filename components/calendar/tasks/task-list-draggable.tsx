"use client";

import { useEffect } from "react";
import { TaskItemCompact } from "@/components/tasks/task-item-compact";
import { TaskWithType } from "@/lib/types";
import { taskWithTypeToTaskLike } from "@/lib/tasks/task-conversion";
import { getTaskTypeClassName } from "@/lib/tasks/task-constants";
import { useDragAndDrop } from "@/lib/hooks/use-drag-and-drop";

interface TaskListDraggableProps {
  tasks: TaskWithType[];
  onUpdate: (formData: FormData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onHide: (task: TaskWithType) => void;
  onSuccess?: () => void;
}

export function TaskListDraggable({
  tasks,
  onUpdate,
  onDelete,
  onHide,
  onSuccess,
}: TaskListDraggableProps) {
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
  } = useDragAndDrop<TaskWithType>(tasks);

  // Update items when tasks change (only if task IDs differ, not just order)
  useEffect(() => {
    const currentIds = new Set(orderedTasks.map(t => t.id));
    const newIds = new Set(tasks.map(t => t.id));
    
    // Only reset if task IDs have changed (added/removed), not just reordered
    const idsChanged = 
      currentIds.size !== newIds.size ||
      [...newIds].some(id => !currentIds.has(id)) ||
      [...currentIds].some(id => !newIds.has(id));
    
    if (idsChanged) {
      setOrderedTasks(tasks);
    }
  }, [tasks, orderedTasks, setOrderedTasks]);

  return (
    <div className="space-y-2">
      {orderedTasks.map((task, index) => (
        <div key={task.id} className="relative">
          {/* Drop zone before task */}
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
                task={taskWithTypeToTaskLike(task)} 
                className={`transition-all ${
                  draggedIndex === index 
                    ? 'shadow-2xl scale-105 ring-4 ring-blue-500/40 ring-offset-2 bg-background border-2 border-blue-500/60' 
                    : ''
                } ${getTaskTypeClassName(task.taskType)}`}
                onSubmit={onUpdate}
                onDelete={onDelete}
                onSuccess={onSuccess}
              />
              {/* Hide button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onHide(task);
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
          
          {/* Drop zone after task */}
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
  );
}

