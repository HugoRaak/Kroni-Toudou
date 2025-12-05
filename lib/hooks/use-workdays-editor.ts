import { useState, useEffect } from 'react';
import { setWorkdayForUserAction, setWorkdayForUserActionForce, setWorkdaysForUserActionForceBatch, checkWorkdayConflictsBatchForUserAction } from '@/app/actions/workdays';
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
  const [confirmedConflicts, setConfirmedConflicts] = useState<Set<number>>(new Set());
  const [hasSavedChanges, setHasSavedChanges] = useState<boolean>(false);
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
    setHasSavedChanges(false);
    setEditing(true);
  };

  const handleCancel = () => {
    setLocalWorkdays(workdays);
    setHasSavedChanges(false);
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
      
      // First, check all changes for conflicts without saving (optimized: single batch call)
      const conflictsByDate = await checkWorkdayConflictsBatchForUserAction(changes);
      
      const conflicts: Array<{ conflict: ModeConflictError; dateStr: string; newMode: WorkMode }> = [];
      const nonConflictChanges: Array<{ dateStr: string; newMode: WorkMode }> = [];
      
      for (const change of changes) {
        const conflictArray = conflictsByDate[change.dateStr] || [];
        
        if (conflictArray.length > 0) {
          // Add all conflicts for this date
          for (const conflict of conflictArray) {
            conflicts.push({ conflict, dateStr: change.dateStr, newMode: change.newMode });
          }
        } else {
          // No conflict, add to non-conflict list
          nonConflictChanges.push(change);
        }
      }
      
      // Save non-conflict changes first (batch operation)
      if (nonConflictChanges.length > 0) {
        await setWorkdaysForUserActionForceBatch(nonConflictChanges);
      }
      
      // Track if any changes were saved (needed for refetch on cancel)
      const hasNonConflictChanges = nonConflictChanges.length > 0;
      setHasSavedChanges(hasNonConflictChanges);
      
      // If there are conflicts, show them one by one
      if (conflicts.length > 0) {
        setModeConflicts(conflicts);
        setCurrentConflictIndex(0);
        setConfirmedConflicts(new Set());
        // Don't close editing mode yet, wait for user to resolve conflicts
        return;
      }
      
      // All changes saved successfully
      setHasSavedChanges(false);
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
        // This is the last conflict, check if there are confirmed conflicts to save
        if (confirmedConflicts.size > 0) {
          // Save all confirmed conflicts that haven't been saved yet
          await saveAllConfirmedConflicts(confirmedConflicts);
        } else {
          // All conflicts resolved
          setModeConflicts([]);
          setCurrentConflictIndex(0);
          setConfirmedConflicts(new Set());
          setHasSavedChanges(false);
          onSaved();
          setEditing(false);
        }
      }
    } else if (result && typeof result === 'object' && 'type' in result && result.type === 'MODE_CONFLICT') {
      // Still a conflict (maybe user didn't move all tasks), use force
      const success = await setWorkdayForUserActionForce(currentConflict.dateStr, currentConflict.newMode);
      if (success) {
        if (currentConflictIndex < modeConflicts.length - 1) {
          setCurrentConflictIndex(currentConflictIndex + 1);
        } else {
          // This is the last conflict, check if there are confirmed conflicts to save
          if (confirmedConflicts.size > 0) {
            // Save all confirmed conflicts that haven't been saved yet
            await saveAllConfirmedConflicts(confirmedConflicts);
          } else {
            setModeConflicts([]);
            setCurrentConflictIndex(0);
            setConfirmedConflicts(new Set());
            setHasSavedChanges(false);
            onSaved();
            setEditing(false);
          }
        }
      } else {
        toast.error("Erreur lors de la modification du mode de travail");
      }
    } else {
      toast.error("Erreur lors de la modification du mode de travail");
    }
  };

  const handleConfirmAnyway = () => {
    if (modeConflicts.length === 0 || currentConflictIndex >= modeConflicts.length) return;
    
    // Mark current conflict as confirmed
    const newConfirmed = new Set(confirmedConflicts);
    newConfirmed.add(currentConflictIndex);
    setConfirmedConflicts(newConfirmed);
    
    // Move to next conflict or save all if all are confirmed
    if (currentConflictIndex < modeConflicts.length - 1) {
      // There are more conflicts, move to next
      setCurrentConflictIndex(currentConflictIndex + 1);
    } else {
      // This is the last conflict, check if all are confirmed before saving
      const allConfirmed = newConfirmed.size === modeConflicts.length;
      if (allConfirmed) {
        // All conflicts confirmed, save all changes at once
        saveAllConfirmedConflicts(newConfirmed);
      } else {
        // Not all conflicts confirmed yet, just move to next (shouldn't happen but safety check)
        setCurrentConflictIndex(currentConflictIndex + 1);
      }
    }
  };

  const saveAllConfirmedConflicts = async (confirmed: Set<number>) => {
    // Save all confirmed conflicts using force (batch operation)
    const conflictsToSave = modeConflicts.filter((_, index) => confirmed.has(index));
    
    try {
      if (conflictsToSave.length > 0) {
        const success = await setWorkdaysForUserActionForceBatch(
          conflictsToSave.map(conflict => ({ dateStr: conflict.dateStr, newMode: conflict.newMode }))
        );
        if (!success) {
          toast.error("Erreur lors de la modification du mode de travail");
          return;
        }
      }
      
      // All conflicts saved successfully
      setModeConflicts([]);
      setCurrentConflictIndex(0);
      setConfirmedConflicts(new Set());
      setHasSavedChanges(false);
      onSaved();
      setEditing(false);
    } catch (error) {
      console.error('Error saving conflicts:', error);
      toast.error("Erreur lors de la modification du mode de travail");
    }
  };

  const handleCancelConflict = () => {
    if (modeConflicts.length === 0) return;
    
    // Revert all conflicted changes in local state
    for (const conflict of modeConflicts) {
      const originalMode = workdays[conflict.dateStr] ?? 'Présentiel';
      setLocalWorkdays(prev => ({ ...prev, [conflict.dateStr]: originalMode }));
    }
    
    // If there were changes saved before conflicts were detected, refetch to show them
    const shouldRefetch = hasSavedChanges;
    
    // Cancel all conflicts and stop editing
    setModeConflicts([]);
    setCurrentConflictIndex(0);
    setConfirmedConflicts(new Set());
    setHasSavedChanges(false);
    setEditing(false);
    
    // Refetch if there were saved changes
    if (shouldRefetch) {
      onSaved();
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
      setHasSavedChanges(false);
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


