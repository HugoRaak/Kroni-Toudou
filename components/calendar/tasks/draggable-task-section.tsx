"use client";

import { useState, useEffect } from 'react';
import { Task } from '@/lib/types';
import { TaskWithShift } from '@/lib/calendar/calendar-utils';
import { TaskItemCompact } from '@/components/tasks/items/task-item-compact';
import { Button } from '@/components/ui/button';
import { GripVertical, Check, X } from 'lucide-react';
import { updateTasksDisplayOrderAction, type ModeConflictError } from '@/app/actions/tasks';
import { useRouter } from 'next/navigation';

interface DraggableTaskSectionProps {
  title: string;
  icon: React.ReactNode;
  titleClassName: string;
  tasks: Task[] | TaskWithShift[];
  taskClassName: string;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onSuccess?: () => void;
  accentColor: 'yellow' | 'violet' | 'orange';
}

export function DraggableTaskSection({
  title,
  icon,
  titleClassName,
  tasks,
  taskClassName,
  onUpdateTask,
  onDeleteTask,
  onSuccess,
  accentColor,
}: DraggableTaskSectionProps) {
  const router = useRouter();
  const [isEditOrderMode, setIsEditOrderMode] = useState(false);
  const [orderedTasks, setOrderedTasks] = useState<Task[] | TaskWithShift[]>(tasks);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditOrderMode) {
      setOrderedTasks(tasks);
    }
  }, [tasks, isEditOrderMode]);

  const handleStartEditOrder = () => {
    setOrderedTasks(tasks);
    setIsEditOrderMode(true);
  };

  const handleCancelEditOrder = () => {
    setIsEditOrderMode(false);
    setOrderedTasks(tasks);
  };

  const handleSaveOrder = async () => {
    if (orderedTasks.length === 0) return;
    
    setIsSaving(true);
    try {
      const taskIds = orderedTasks.map(task => task.id);
      const success = await updateTasksDisplayOrderAction(taskIds);
      if (success) {
        setIsEditOrderMode(false);
        router.refresh();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error saving order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderChange = (newOrderedTasks: Task[] | TaskWithShift[]) => {
    setOrderedTasks(newOrderedTasks);
  };

  if (tasks.length === 0) return null;

  const accentClasses = {
    yellow: 'hover:bg-yellow-50 text-yellow-700',
    violet: 'hover:bg-violet-50 text-violet-700',
    orange: 'hover:bg-orange-50 text-orange-700',
  };

  const tasksToDisplay = isEditOrderMode ? orderedTasks : tasks;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${titleClassName} flex items-center gap-2`}>
          {icon}
          {title}
        </h3>
        {!isEditOrderMode ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEditOrder}
            disabled={tasks.length === 0}
            className={`h-8 text-xs ${accentClasses[accentColor]} cursor-pointer`}
          >
            <GripVertical className="h-4 w-4 mr-1" />
            Ordre
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveOrder}
              disabled={isSaving}
              className={`h-8 text-xs ${accentClasses[accentColor]} cursor-pointer`}
            >
              <Check className="h-4 w-4 mr-1" />
              {isSaving ? '...' : ''}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEditOrder}
              disabled={isSaving}
              className={`h-8 text-xs ${accentClasses[accentColor]} cursor-pointer`}
            >
              <X className="h-4 w-4 mr-1" />
            </Button>
          </div>
        )}
      </div>
      {isEditOrderMode ? (
        <DraggableTaskList
          tasks={tasksToDisplay}
          taskClassName={taskClassName}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onOrderChange={handleOrderChange}
        />
      ) : (
        <div className="space-y-2">
          {tasksToDisplay.map((task) => (
            <TaskItemCompact
              key={task.id}
              task={task}
              className={taskClassName}
              onSubmit={onUpdateTask}
              onDelete={onDeleteTask}
              onSuccess={onSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DraggableTaskList({
  tasks,
  taskClassName,
  onUpdateTask,
  onDeleteTask,
  onOrderChange,
}: {
  tasks: Task[] | TaskWithShift[];
  taskClassName: string;
  onUpdateTask: (formData: FormData) => Promise<boolean | ModeConflictError>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onOrderChange: (orderedTasks: Task[] | TaskWithShift[]) => void;
}) {
  const [orderedTasks, setOrderedTasks] = useState<Task[] | TaskWithShift[]>(tasks);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

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
    items: Task[] | TaskWithShift[],
    draggedIndex: number,
    targetIndex: number,
    position: 'before' | 'after'
  ): Task[] | TaskWithShift[] => {
    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    
    newItems.splice(draggedIndex, 1);
    
    let insertIndex = targetIndex;
    if (position === 'after') {
      insertIndex = targetIndex + 1;
    }
    
    if (draggedIndex < insertIndex) {
      insertIndex -= 1;
    }
    
    newItems.splice(insertIndex, 0, draggedItem);
    
    return newItems;
  };

  const handleDropZoneDragOver = (e: React.DragEvent, targetIndex: number, position: 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      setDragOverIndex(targetIndex);
      setDropPosition(position);
    }
  };

  const handleDropZoneDrop = (e: React.DragEvent, targetIndex: number, position: 'before' | 'after') => {
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
    <div className="space-y-2">
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
              ? 'bg-primary/20 border-t-2 border-dashed border-primary' 
              : ''
          }`}
        />
      )}

      {orderedTasks.map((task, index) => (
        <div key={task.id} className="relative">
          {index > 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const mouseY = e.clientY;
                const middle = rect.top + rect.height / 2;
                
                if (mouseY < middle) {
                  handleDropZoneDragOver(e, index - 1, 'after');
                } else {
                  handleDropZoneDragOver(e, index, 'before');
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
                  ? 'bg-primary/20 border-t-2 border-b-2 border-dashed border-primary' 
                  : ''
              }`}
            />
          )}

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
              draggedIndex === index 
                ? 'opacity-50 cursor-grabbing z-50' 
                : 'cursor-move z-0'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-muted-foreground cursor-move">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <TaskItemCompact
                  task={task}
                  className={taskClassName}
                  onSubmit={onUpdateTask}
                  onDelete={onDeleteTask}
                />
              </div>
            </div>
            {dragOverIndex === index && dropPosition === 'before' && draggedIndex !== null && draggedIndex !== index && (
              <div className="absolute -top-2 left-0 right-0 h-1 bg-primary/70 rounded-full z-20" />
            )}
            {dragOverIndex === index && dropPosition === 'after' && draggedIndex !== null && draggedIndex !== index && (
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/70 rounded-full z-20" />
            )}
          </div>
        </div>
      ))}

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
            dragOverIndex === orderedTasks.length - 1 && dropPosition === 'after' && draggedIndex !== null
              ? 'bg-primary/20 border-b-2 border-dashed border-primary' 
              : ''
          }`}
        />
      )}
    </div>
  );
}

