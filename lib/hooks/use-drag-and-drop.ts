import { useState } from 'react';
import { getTodayTaskOrder, saveTodayTaskOrder } from '@/lib/localStorage-tasks';

export function useDragAndDrop<T extends { id: string }>(
  initialItems: T[],
  onOrderChange?: (items: T[]) => void
) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

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
    
    if (draggedIndex === null) {
      resetDragState();
      return;
    }

    const newItems = reorderItems(items, draggedIndex, targetIndex, position);
    updateItems(newItems);
    
    // Save to localStorage if items have id
    if (newItems.length > 0) {
      saveTodayTaskOrder(newItems.map(item => item.id));
    }
    
    resetDragState();
  };

  const handleTaskDragOver = (e: React.DragEvent, index: number) => {
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

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || dropPosition === null) {
      resetDragState();
      return;
    }

    const newItems = reorderItems(items, draggedIndex, dropIndex, dropPosition);
    updateItems(newItems);
    
    // Save to localStorage
    if (newItems.length > 0) {
      saveTodayTaskOrder(newItems.map(item => item.id));
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

