import { useState, useEffect, useCallback } from 'react';
import { TaskWithType } from '@/lib/types';
import { storage } from '@/lib/storage/localStorage-helpers';

export function useDayViewState(isTodayView: boolean) {
  // Always initialize with 'single' to ensure server/client match
  const [layout, setLayout] = useState<'single' | 'three-column'>('single');
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false);
  const [taskToHide, setTaskToHide] = useState<TaskWithType | null>(null);
  const [orderVersion, setOrderVersion] = useState(0);

  // Read from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLayout(storage.dayViewLayout.get());
  }, []);

  // Listen for order updates from drag & drop
  useEffect(() => {
    if (!isTodayView) return;
    
    const handler = () => {
      setOrderVersion(v => v + 1);
    };
    window.addEventListener('task-order-updated', handler);
    return () => window.removeEventListener('task-order-updated', handler);
  }, [isTodayView]);

  const handleToggleLayout = useCallback(() => {
    const newLayout = layout === 'single' ? 'three-column' : 'single';
    setLayout(newLayout);
    storage.dayViewLayout.set(newLayout);
  }, [layout]);

  const handleHideTaskClick = useCallback((task: TaskWithType) => {
    setTaskToHide(task);
    setHideConfirmOpen(true);
  }, []);

  const handleConfirmHide = useCallback(() => {
    setHideConfirmOpen(false);
    setTaskToHide(null);
  }, []);

  const handleCancelHide = useCallback(() => {
    setHideConfirmOpen(false);
    setTaskToHide(null);
  }, []);

  return {
    layout,
    hideConfirmOpen,
    taskToHide,
    orderVersion,
    handleToggleLayout,
    handleHideTaskClick,
    handleConfirmHide,
    handleCancelHide,
  };
}

