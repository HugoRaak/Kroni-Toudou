'use client';

import { useEffect } from 'react';
import { TaskItemCompact } from '@/components/tasks/items/task-item-compact';
import { TaskWithType } from '@/lib/types';
import { taskWithTypeToTaskLike } from '@/lib/tasks/processing/task-conversion';
import { getTaskTypeClassName } from '@/lib/tasks/constants/task-constants';
import { useDragAndDrop } from '@/lib/hooks/ui/use-drag-and-drop';
import type { ModeConflictError } from '@/app/actions/tasks';

interface TaskListDraggableProps {
  tasks: TaskWithType[];
  onUpdate: (formData: FormData) => Promise<boolean | ModeConflictError>;
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
    handleDrop,
    handleDragEnd,
  } = useDragAndDrop<TaskWithType>(tasks);

  // Update items when tasks change (only if task IDs differ, not just order)
  useEffect(() => {
    const currentIds = new Set(orderedTasks.map((t) => t.id));
    const newIds = new Set(tasks.map((t) => t.id));

    // Only reset if task IDs have changed (added/removed), not just reordered
    const idsChanged =
      currentIds.size !== newIds.size ||
      [...newIds].some((id) => !currentIds.has(id)) ||
      [...currentIds].some((id) => !newIds.has(id));

    if (idsChanged) {
      setOrderedTasks(tasks);
    }
  }, [tasks, orderedTasks, setOrderedTasks]);

  return (
    <div className="space-y-2">
      {/* Drop zone before first task */}
      {orderedTasks.length > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDropZoneDragOver(e, 0, 'before');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDropZoneDrop(e, 0, 'before');
          }}
          className={`h-4 -mb-2 transition-all ${
            draggedIndex !== null ? 'pointer-events-auto' : 'pointer-events-none'
          } ${
            dragOverIndex === 0 && dropPosition === 'before' && draggedIndex !== null
              ? 'bg-blue-500/20 border-t-2 border-dashed border-blue-500'
              : ''
          }`}
        />
      )}

      {orderedTasks.map((task, index) => (
        <div key={task.id} className="relative">
          {/* Drop zone between tasks */}
          {index > 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Determine if we're closer to the previous task (after) or current task (before)
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const mouseY = e.clientY;
                const middle = rect.top + rect.height / 2;

                if (mouseY < middle) {
                  // Closer to previous task, drop after it
                  handleDropZoneDragOver(e, index - 1, 'after');
                } else {
                  // Closer to current task, drop before it
                  handleDropZoneDragOver(e, index, 'before');
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Determine drop position based on mouse position
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const mouseY = e.clientY;
                const middle = rect.top + rect.height / 2;

                if (mouseY < middle) {
                  handleDropZoneDrop(e, index - 1, 'after');
                } else {
                  handleDropZoneDrop(e, index, 'before');
                }
              }}
              className={`h-4 -mt-2 -mb-2 transition-all z-20 ${
                draggedIndex !== null ? 'pointer-events-auto' : 'pointer-events-none'
              } ${
                (dragOverIndex === index - 1 &&
                  dropPosition === 'after' &&
                  draggedIndex !== null) ||
                (dragOverIndex === index && dropPosition === 'before' && draggedIndex !== null)
                  ? 'bg-blue-500/20 border-t-2 border-b-2 border-dashed border-blue-500'
                  : ''
              }`}
            />
          )}

          {/* Task item */}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              handleDragStart(index);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              handleTaskDragOver(e, index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDrop(e, index);
            }}
            onDragEnd={handleDragEnd}
            className={`relative group transition-all duration-200 ${
              draggedIndex === index
                ? 'z-50 cursor-grabbing opacity-50'
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
                <svg
                  className="w-5 h-5 text-muted-foreground hover:text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>
            {dragOverIndex === index &&
              dropPosition === 'before' &&
              draggedIndex !== null &&
              draggedIndex !== index && (
                <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-500/70 rounded-full z-20" />
              )}
            {dragOverIndex === index &&
              dropPosition === 'after' &&
              draggedIndex !== null &&
              draggedIndex !== index && (
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-blue-500/70 rounded-full z-20" />
              )}
          </div>
        </div>
      ))}

      {/* Drop zone after last task */}
      {orderedTasks.length > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const lastIndex = orderedTasks.length - 1;
            handleDropZoneDragOver(e, lastIndex, 'after');
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const lastIndex = orderedTasks.length - 1;
            handleDropZoneDrop(e, lastIndex, 'after');
          }}
          className={`h-4 -mt-2 transition-all ${
            draggedIndex !== null ? 'pointer-events-auto' : 'pointer-events-none'
          } ${
            dragOverIndex === orderedTasks.length - 1 &&
            dropPosition === 'after' &&
            draggedIndex !== null
              ? 'bg-blue-500/20 border-b-2 border-dashed border-blue-500'
              : ''
          }`}
        />
      )}
    </div>
  );
}
