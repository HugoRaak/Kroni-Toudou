'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import TaskItem from '@/components/tasks/items/task-item';
import type { ModeConflictError } from '@/app/actions/tasks';

interface DraggableTaskListProps {
  tasks: Task[];
  onSubmit: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDelete: (id: string) => Promise<boolean>;
  showProgressStatus?: boolean;
  onOrderChange: (orderedTasks: Task[]) => void;
}

export function DraggableTaskList({
  tasks,
  onSubmit,
  onDelete,
  showProgressStatus = false,
  onOrderChange,
}: DraggableTaskListProps) {
  const [orderedTasks, setOrderedTasks] = useState<Task[]>(tasks);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // Update ordered tasks when tasks prop changes
  useEffect(() => {
    setOrderedTasks(tasks);
  }, [tasks]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const elementMiddle = rect.top + rect.height / 2;

      if (mouseY < elementMiddle) {
        setDragOverIndex(index);
        setDropPosition('before');
      } else {
        setDragOverIndex(index);
        setDropPosition('after');
      }
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || dropPosition === null) {
      resetDragState();
      return;
    }

    const newTasks = reorderTasks(orderedTasks, draggedIndex, dropIndex, dropPosition);
    setOrderedTasks(newTasks);
    onOrderChange(newTasks);
    resetDragState();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const reorderTasks = (
    items: Task[],
    draggedIndex: number,
    targetIndex: number,
    position: 'before' | 'after',
  ): Task[] => {
    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];

    // Remove from old position
    newItems.splice(draggedIndex, 1);

    // Calculate insertion index
    let insertIndex = targetIndex;
    if (position === 'after') {
      insertIndex = targetIndex + 1;
    }

    // Adjust if we removed before the insertion point
    if (draggedIndex < insertIndex) {
      insertIndex -= 1;
    }

    // Insert at new position
    newItems.splice(insertIndex, 0, draggedItem);

    return newItems;
  };

  const handleDropZoneDragOver = (
    e: React.DragEvent,
    targetIndex: number,
    position: 'before' | 'after',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      setDragOverIndex(targetIndex);
      setDropPosition(position);
    }
  };

  const handleDropZoneDrop = (
    e: React.DragEvent,
    targetIndex: number,
    position: 'before' | 'after',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null) {
      const newTasks = reorderTasks(orderedTasks, draggedIndex, targetIndex, position);
      setOrderedTasks(newTasks);
      onOrderChange(newTasks);
      resetDragState();
    }
  };

  return (
    <div className="space-y-3">
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
          className={`h-4 -mb-3 transition-all ${
            draggedIndex !== null ? 'pointer-events-auto' : 'pointer-events-none'
          } ${
            dragOverIndex === 0 && dropPosition === 'before' && draggedIndex !== null
              ? 'bg-primary/20 border-t-2 border-dashed border-primary'
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
              className={`h-4 -mt-3 -mb-3 transition-all z-20 ${
                draggedIndex !== null ? 'pointer-events-auto' : 'pointer-events-none'
              } ${
                (dragOverIndex === index - 1 &&
                  dropPosition === 'after' &&
                  draggedIndex !== null) ||
                (dragOverIndex === index && dropPosition === 'before' && draggedIndex !== null)
                  ? 'bg-primary/20 border-t-2 border-b-2 border-dashed border-primary'
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
              handleDragOver(e, index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDrop(e, index);
            }}
            onDragEnd={handleDragEnd}
            className={`relative transition-all ${
              draggedIndex === index ? 'opacity-50 cursor-grabbing z-50' : 'cursor-move z-0'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground cursor-move">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="12" r="1" />
                  <circle cx="9" cy="5" r="1" />
                  <circle cx="9" cy="19" r="1" />
                  <circle cx="15" cy="12" r="1" />
                  <circle cx="15" cy="5" r="1" />
                  <circle cx="15" cy="19" r="1" />
                </svg>
              </div>
              <div className="flex-1">
                <TaskItem
                  task={task}
                  onSubmit={onSubmit}
                  onDelete={onDelete}
                  showProgressStatus={showProgressStatus}
                />
              </div>
            </div>
            {dragOverIndex === index &&
              dropPosition === 'before' &&
              draggedIndex !== null &&
              draggedIndex !== index && (
                <div className="absolute -top-2 left-0 right-0 h-1 bg-primary/70 rounded-full z-20" />
              )}
            {dragOverIndex === index &&
              dropPosition === 'after' &&
              draggedIndex !== null &&
              draggedIndex !== index && (
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/70 rounded-full z-20" />
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
          className={`h-4 -mt-3 transition-all ${
            draggedIndex !== null ? 'pointer-events-auto' : 'pointer-events-none'
          } ${
            dragOverIndex === orderedTasks.length - 1 &&
            dropPosition === 'after' &&
            draggedIndex !== null
              ? 'bg-primary/20 border-b-2 border-dashed border-primary'
              : ''
          }`}
        />
      )}
    </div>
  );
}
