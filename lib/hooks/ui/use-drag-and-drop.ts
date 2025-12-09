import { useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { saveTodayTaskOrder } from '@/lib/storage/localStorage-tasks';

export function useDragAndDrop<T extends { id: string }>(
  initialItems: T[],
  onOrderChange?: (items: T[]) => void
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(initialItems);
  }, [initialItems]);

  // Update items when initialItems change
  const updateItems = (newItems: T[]) => {
    setItems(newItems);
    if (onOrderChange) {
      onOrderChange(newItems);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDropZoneDragOver = (e: DragEvent, targetIndex: number, position: 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) return;
    
    // Calculate where the item would be inserted
    let insertIndex = targetIndex;
    if (position === 'after') {
      insertIndex = targetIndex + 1;
    }
    
    // Adjust for the fact that we'll remove the dragged item first
    let finalInsertIndex = insertIndex;
    if (draggedIndex < insertIndex) {
      finalInsertIndex = insertIndex - 1;
    }
    
    // Allow drop if it results in a different position
    // Also allow if we're dropping adjacent to current position (which is valid)
    const isValidPosition = draggedIndex !== finalInsertIndex;
    
    if (isValidPosition) {
      setDragOverIndex(targetIndex);
      setDropPosition(position);
    }
  };

  const handleDropZoneDrop = (e: DragEvent, targetIndex: number, position: 'before' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null) {
      resetDragState();
      return;
    }

    // Calculate the actual insertion index after removing the dragged item
    let insertIndex = targetIndex;
    if (position === 'after') {
      insertIndex = targetIndex + 1;
    }
    
    // Adjust insertIndex if we're moving forward (the dragged item will be removed)
    let finalInsertIndex = insertIndex;
    if (draggedIndex < insertIndex) {
      finalInsertIndex = insertIndex - 1;
    }
    
    // Check if this is a valid drop (not dropping at the same position)
    if (draggedIndex === finalInsertIndex) {
      resetDragState();
      return;
    }

    const newItems = reorderItems(items, draggedIndex, targetIndex, position);
    updateItems(newItems);
    
    // Save to localStorage if items have id and no custom onOrderChange handler
    // (if onOrderChange is provided, it should handle saving)
    if (newItems.length > 0 && !onOrderChange) {
      saveTodayTaskOrder(newItems.map(item => item.id));
      // Trigger event to notify that order was saved
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('task-order-updated'));
      }
    }
    
    resetDragState();
  };

  const handleTaskDragOver = (e: DragEvent, index: number) => {
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

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDrop = (e: DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || dropPosition === null) {
      resetDragState();
      return;
    }

    const newItems = reorderItems(items, draggedIndex, dropIndex, dropPosition);
    updateItems(newItems);
    
    // Save to localStorage if no custom onOrderChange handler
    // (if onOrderChange is provided, it should handle saving)
    if (newItems.length > 0 && !onOrderChange) {
      saveTodayTaskOrder(newItems.map(item => item.id));
      // Trigger event to notify that order was saved
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('task-order-updated'));
      }
    }
    
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

  const reorderItems = (
    items: T[],
    draggedIndex: number,
    targetIndex: number,
    position: 'before' | 'after'
  ): T[] => {
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

  return {
    items,
    setItems: updateItems,
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
  };
}

