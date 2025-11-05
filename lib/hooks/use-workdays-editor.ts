import { useState, useEffect } from 'react';
import { setWorkdayForUserAction, setWorkdayForUserActionForce, checkWorkdayConflictForUserAction } from '@/app/actions/workdays';
import { ModeConflictError } from '@/app/actions/tasks';
import { formatDateLocal, parseDateLocal, isPastDate } from '@/lib/utils';
import { getCurrentUserIdAction } from '@/app/actions/tasks';
import { updateTaskAction } from '@/app/actions/tasks';
import { toast } from 'sonner';

type WorkMode = 'Présentiel' | 'Distanciel' | 'Congé';

export function useWorkdaysEditor(
  workdays: Record<string, WorkMode>,
  onSaved: () => void,
  getDatesToSave?: () => Date[]
) {
  const [editing, setEditing] = useState(false);
  const [localWorkdays, setLocalWorkdays] = useState<Record<string, WorkMode>>({});
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modeConflicts, setModeConflicts] = useState<Array<{ conflict: ModeConflictError; dateStr: string; newMode: WorkMode }>>([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState<number>(0);
  const [pendingChanges, setPendingChanges] = useState<Array<{ dateStr: string; newMode: WorkMode }>>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setLocalWorkdays(workdays);
  }, [workdays, editing]);

  useEffect(() => {
    if (!userId) {
      getCurrentUserIdAction().then(setUserId);
    }
  }, [userId]);

  const cycleMode = (mode: WorkMode): WorkMode => {
    if (mode === 'Présentiel') return 'Distanciel';
    if (mode === 'Distanciel') return 'Congé';
    return 'Présentiel';
  };

  const handleDayClick = (dateObj: Date) => {
    if (editing) {
      // Prevent editing past dates
      if (isPastDate(dateObj)) {
        return;
      }
      const iso = formatDateLocal(dateObj);
      const current = (localWorkdays[iso] ?? 'Présentiel');
      const next = cycleMode(current);
      setLocalWorkdays((prev: Record<string, WorkMode>) => ({ ...prev, [iso]: next }));
    } else {
      setSelectedDate(dateObj);
      setDialogOpen(true);
    }
  };

  const handleStartEdit = () => {
    setLocalWorkdays(workdays);
    setEditing(true);
  };

  const handleCancel = () => {
    setLocalWorkdays(workdays);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changes: Array<{ dateStr: string; newMode: WorkMode }> = [];
      
      if (getDatesToSave) {
        // Use custom date range (e.g., for month view)
        const dates = getDatesToSave();
        for (const date of dates) {
          const iso = formatDateLocal(date);
          const from = workdays[iso] ?? 'Présentiel';
          const to = localWorkdays[iso] ?? 'Présentiel';
          if (from !== to) {
            changes.push({ dateStr: iso, newMode: to });
          }
        }
      } else {
        // Use all changed workdays (e.g., for week view)
        for (const [iso, to] of Object.entries(localWorkdays)) {
          const from = workdays[iso] ?? 'Présentiel';
          if (from !== to) {
            changes.push({ dateStr: iso, newMode: to });
          }
        }
      }
      
      // First, check all changes for conflicts without saving
      const conflicts: Array<{ conflict: ModeConflictError; dateStr: string; newMode: WorkMode }> = [];
      const nonConflictChanges: Array<{ dateStr: string; newMode: WorkMode }> = [];
      
      for (const change of changes) {
        const conflict = await checkWorkdayConflictForUserAction(change.dateStr, change.newMode);
        
        if (conflict) {
          conflicts.push({ conflict, dateStr: change.dateStr, newMode: change.newMode });
        } else {
          // No conflict, add to non-conflict list
          nonConflictChanges.push(change);
        }
      }
      
      // Save non-conflict changes first
      for (const change of nonConflictChanges) {
        await setWorkdayForUserActionForce(change.dateStr, change.newMode);
      }
      
      // If there are conflicts, show them one by one
      if (conflicts.length > 0) {
        setModeConflicts(conflicts);
        setCurrentConflictIndex(0);
        // Don't close editing mode yet, wait for user to resolve conflicts
        return;
      }
      
      // All changes saved successfully
      onSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = async (taskId: string, newDate: string) => {
    if (!userId) return;
    const result = await updateTaskAction(taskId, { due_on: newDate });
    if (result && typeof result === 'object' && 'id' in result) {
      // Task updated successfully
      return;
    }
    toast.error("Erreur lors de la modification de la date de la tâche");
  };

  const handleConflictResolved = async () => {
    // When tasks are moved, the conflict is resolved, so we can save normally
    if (modeConflicts.length === 0 || currentConflictIndex >= modeConflicts.length) return;
    
    const currentConflict = modeConflicts[currentConflictIndex];
    
    // Try to save normally (should work now that tasks are moved)
    const result = await setWorkdayForUserAction(currentConflict.dateStr, currentConflict.newMode);
    
    if (result === true) {
      // Successfully saved
      // Move to next conflict or finish
      if (currentConflictIndex < modeConflicts.length - 1) {
        setCurrentConflictIndex(currentConflictIndex + 1);
      } else {
        // All conflicts resolved
        setModeConflicts([]);
        setCurrentConflictIndex(0);
        onSaved();
        setEditing(false);
      }
    } else if (result && typeof result === 'object' && 'type' in result && result.type === 'MODE_CONFLICT') {
      // Still a conflict (maybe user didn't move all tasks), use force
      const success = await setWorkdayForUserActionForce(currentConflict.dateStr, currentConflict.newMode);
      if (success) {
        if (currentConflictIndex < modeConflicts.length - 1) {
          setCurrentConflictIndex(currentConflictIndex + 1);
        } else {
          setModeConflicts([]);
          setCurrentConflictIndex(0);
          onSaved();
          setEditing(false);
        }
      } else {
        toast.error("Erreur lors de la modification du mode de travail");
      }
    } else {
      toast.error("Erreur lors de la modification du mode de travail");
    }
  };

  const handleConfirmAnyway = async () => {
    if (modeConflicts.length === 0 || currentConflictIndex >= modeConflicts.length) return;
    
    const currentConflict = modeConflicts[currentConflictIndex];
    
    // Save the conflicted change using force
    const success = await setWorkdayForUserActionForce(currentConflict.dateStr, currentConflict.newMode);
    
    if (success) {
      // Move to next conflict or finish
      if (currentConflictIndex < modeConflicts.length - 1) {
        // There are more conflicts, move to next
        setCurrentConflictIndex(currentConflictIndex + 1);
      } else {
        // All conflicts resolved
        setModeConflicts([]);
        setCurrentConflictIndex(0);
        onSaved();
        setEditing(false);
      }
    } else {
      toast.error("Erreur lors de la modification du mode de travail");
    }
  };

  const handleCancelConflict = () => {
    if (modeConflicts.length === 0) return;
    
    const currentConflict = modeConflicts[currentConflictIndex];
    
    // Revert the conflicted change in local state
    const originalMode = workdays[currentConflict.dateStr] ?? 'Présentiel';
    setLocalWorkdays(prev => ({ ...prev, [currentConflict.dateStr]: originalMode }));
    
    // Move to next conflict or cancel all
    if (currentConflictIndex < modeConflicts.length - 1) {
      // There are more conflicts, move to next
      setCurrentConflictIndex(currentConflictIndex + 1);
    } else {
      // Cancel all remaining conflicts and stop editing
      setModeConflicts([]);
      setCurrentConflictIndex(0);
      setEditing(false);
    }
  };

  const handleSkipConflict = () => {
    // Skip this conflict and move to next, or finish if last
    if (currentConflictIndex < modeConflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
    } else {
      // All conflicts processed (some skipped)
      setModeConflicts([]);
      setCurrentConflictIndex(0);
      onSaved();
      setEditing(false);
    }
  };

  const currentConflict = modeConflicts.length > 0 && currentConflictIndex < modeConflicts.length 
    ? modeConflicts[currentConflictIndex] 
    : null;

  return {
    editing,
    localWorkdays,
    saving,
    selectedDate,
    dialogOpen,
    setSelectedDate,
    setDialogOpen,
    handleDayClick,
    handleStartEdit,
    handleCancel,
    handleSave,
    modeConflict: currentConflict,
    modeConflicts,
    currentConflictIndex,
    totalConflicts: modeConflicts.length,
    userId,
    handleDateChange,
    handleConfirmAnyway,
    handleCancelConflict,
    handleSkipConflict,
    handleConflictResolved,
  };
}


