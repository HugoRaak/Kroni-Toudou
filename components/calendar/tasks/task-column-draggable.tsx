"use client";

import { useEffect } from "react";
import { TaskItemCompact } from "@/components/tasks/task-item-compact";
import { TaskWithType } from "@/lib/types";
import { taskWithTypeToTaskLike } from "@/lib/tasks/task-conversion";
import { getTaskTypeClassName } from "@/lib/tasks/task-constants";
import { useDragAndDrop } from "@/lib/hooks/use-drag-and-drop";
import { saveTodayTaskOrder } from "@/lib/storage/localStorage-tasks";
import type { ModeConflictError } from "@/app/actions/tasks";

interface TaskColumnDraggableProps {
  columnTasks: TaskWithType[];
  allTasks: TaskWithType[];
  onUpdate: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDelete: (id: string) => Promise<boolean>;
  onHide: (task: TaskWithType) => void;
  onSuccess?: () => void;
}

export function TaskColumnDraggable({
  columnTasks,
  allTasks,
  onUpdate,
  onDelete,
  onHide,
  onSuccess,
}: TaskColumnDraggableProps) {
  // Handler to update global order when column order changes
  const handleOrderChange = (orderedColumnTasks: TaskWithType[]) => {
    // Get current global order
    const currentOrder = allTasks.map(t => t.id);
    
    // Get IDs of tasks in this column (ordered)
    const columnIds = orderedColumnTasks.map(t => t.id);
    const columnIdsSet = new Set(columnIds);
    
    // Find all positions of column tasks in the global order
    const columnIndices: number[] = [];
    currentOrder.forEach((id, index) => {
      if (columnIdsSet.has(id)) {
        columnIndices.push(index);
      }
    });
    
    // If no column tasks found in global order, just append them at the end
    if (columnIndices.length === 0) {
      const otherIds = currentOrder.filter(id => !columnIdsSet.has(id));
      const newGlobalOrder = [...otherIds, ...columnIds];
      saveTodayTaskOrder(newGlobalOrder);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('task-order-updated'));
      }
      return;
    }
    
    // Find the first position where a column task appears
    const firstColumnIndex = columnIndices[0];
    
    // Build new global order: preserve order of tasks before first column task,
    // insert reordered column tasks, then preserve order of tasks after last column task
    const beforeIds = currentOrder.slice(0, firstColumnIndex).filter(id => !columnIdsSet.has(id));
    const afterStartIndex = Math.max(...columnIndices) + 1;
    const afterIds = currentOrder.slice(afterStartIndex).filter(id => !columnIdsSet.has(id));
    
    const newGlobalOrder = [...beforeIds, ...columnIds, ...afterIds];
    
    // Save updated global order
    saveTodayTaskOrder(newGlobalOrder);
    
    // Trigger event to notify that order was updated
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('task-order-updated'));
    }
  };

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
  } = useDragAndDrop<TaskWithType>(columnTasks, handleOrderChange);

  // Update items when columnTasks change (only if task IDs differ, not just order)
  useEffect(() => {
    const currentIds = new Set(orderedTasks.map(t => t.id));
    const newIds = new Set(columnTasks.map(t => t.id));
    
    // Only reset if task IDs have changed (added/removed), not just reordered
    const idsChanged = 
      currentIds.size !== newIds.size ||
      [...newIds].some(id => !currentIds.has(id)) ||
      [...currentIds].some(id => !newIds.has(id));
    
    if (idsChanged) {
      setOrderedTasks(columnTasks);
    }
  }, [columnTasks, orderedTasks, setOrderedTasks]);

  if (orderedTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Drop zone before first task */}
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
                (dragOverIndex === index - 1 && dropPosition === 'after' && draggedIndex !== null) ||
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
        </div>
      ))}
      
      {/* Drop zone after last task */}
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
          dragOverIndex === orderedTasks.length - 1 && dropPosition === 'after' && draggedIndex !== null
            ? 'bg-blue-500/20 border-b-2 border-dashed border-blue-500' 
            : ''
        }`}
      />
    </div>
  );
}

