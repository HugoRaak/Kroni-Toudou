"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { setWorkdayForUserAction, setWorkdayForUserActionForce } from "@/app/actions/workdays";
import { ModeConflictError } from "@/app/actions/tasks";
import { formatDateLocal } from "@/lib/utils";
import { WorkModeConflictDialog } from "@/components/calendar/workmode-conflict-dialog";
import { updateTaskAction } from "@/app/actions/tasks";
import { getCurrentUserIdAction } from "@/app/actions/tasks";
import { toast } from "sonner";

type WorkMode = "Présentiel" | "Distanciel" | "Congé";

type WorkModeBadgeProps = {
  workMode: WorkMode;
  date: Date;
  onSaved?: () => void;
  disabled?: boolean;
  saveButtonClassName?: string;
};

const cycleMode = (mode: WorkMode): WorkMode => {
  if (mode === 'Présentiel') return 'Distanciel';
  if (mode === 'Distanciel') return 'Congé';
  return 'Présentiel';
};

export function WorkModeBadge({
  workMode,
  date,
  onSaved,
  disabled = false,
  saveButtonClassName = "h-6 w-6 p-0 grid place-items-center cursor-pointer",
}: WorkModeBadgeProps) {
  const [selectedMode, setSelectedMode] = useState<WorkMode>(workMode);
  const [saving, setSaving] = useState(false);
  const [modeConflicts, setModeConflicts] = useState<ModeConflictError[]>([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [confirmedConflicts, setConfirmedConflicts] = useState<Set<number>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedMode(workMode);
  }, [workMode]);

  useEffect(() => {
    if (!userId) {
      getCurrentUserIdAction().then(setUserId);
    }
  }, [userId]);

  const handleClickBadge = () => {
    if (disabled) return;
    setSelectedMode(prev => cycleMode(prev));
  };

  const handleSave = async () => {
    if (selectedMode === workMode) return;
    setSaving(true);
    try {
      const dateStr = formatDateLocal(date);
      const result = await setWorkdayForUserAction(dateStr, selectedMode);
      
      // Check for mode conflict (can be single conflict or array of conflicts)
      if (result && typeof result === 'object') {
        let conflicts: ModeConflictError[] = [];
        
        if (Array.isArray(result)) {
          // Multiple conflicts - keep all conflicts (one per task)
          if (result.length > 0 && result[0].type === 'MODE_CONFLICT') {
            conflicts = result as ModeConflictError[];
          }
        } else if ('type' in result && result.type === 'MODE_CONFLICT') {
          // Single conflict
          conflicts = [result as ModeConflictError];
        }
        
        if (conflicts.length > 0) {
          setModeConflicts(conflicts);
          setCurrentConflictIndex(0);
          setConfirmedConflicts(new Set());
          setSelectedMode(workMode);
          return;
        }
      }
      
      if (result === true) {
        onSaved?.();
      }
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
    // Move to next conflict or finish
    if (currentConflictIndex < modeConflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
    } else {
      // All conflicts resolved, save the work mode change
      if (modeConflicts.length > 0) {
        const lastConflict = modeConflicts[modeConflicts.length - 1];
        const success = await setWorkdayForUserActionForce(lastConflict.taskDate, lastConflict.workMode);
        if (success) {
          setModeConflicts([]);
          setCurrentConflictIndex(0);
          onSaved?.();
        } else {
          toast.error("Erreur lors de la modification du mode de travail");
        }
      }
    }
  };

  const handleConfirmAnyway = () => {
    if (modeConflicts.length === 0) return;
    
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
      }
    }
  };

  const saveAllConfirmedConflicts = async (confirmed: Set<number>) => {
    // Save all confirmed conflicts using force
    const conflictsToSave = modeConflicts.filter((_, index) => confirmed.has(index));
    
    try {
      for (const conflict of conflictsToSave) {
        const success = await setWorkdayForUserActionForce(conflict.taskDate, conflict.workMode);
        if (!success) {
          toast.error("Erreur lors de la modification du mode de travail");
          return;
        }
      }
      
      // All conflicts saved successfully
      setModeConflicts([]);
      setCurrentConflictIndex(0);
      setConfirmedConflicts(new Set());
      onSaved?.();
    } catch (error) {
      console.error('Error saving conflicts:', error);
      toast.error("Erreur lors de la modification du mode de travail");
    }
  };

  const handleCancel = () => {
    setModeConflicts([]);
    setCurrentConflictIndex(0);
    setConfirmedConflicts(new Set());
    setSelectedMode(workMode);
  };

  const containerClassName = saveButtonClassName.includes('absolute')
    ? "relative flex items-center justify-center gap-1"
    : "flex items-center justify-center gap-1";

  return (
    <div className={containerClassName}>
      <button
        type="button"
        onClick={handleClickBadge}
        disabled={disabled}
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border cursor-pointer ${
          selectedMode === 'Congé'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : selectedMode === 'Distanciel'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-pink-50 text-pink-700 border-pink-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {selectedMode === 'Distanciel' ? 'Distanciel' : selectedMode}
      </button>
      {selectedMode !== workMode && (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || disabled}
          className={saveButtonClassName}
          title="Enregistrer le mode"
          aria-label="Enregistrer le mode"
        >
          {saving ? (
            <span className="text-xs">...</span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-7.5 9.5a.75.75 0 0 1-1.093.08l-4-4a.75.75 0 1 1 1.06-1.06l3.41 3.41 6.98-8.846a.75.75 0 0 1 1.052-.136Z" clipRule="evenodd" />
            </svg>
          )}
        </Button>
      )}
      
      {modeConflicts.length > 0 && userId && currentConflictIndex < modeConflicts.length && (
        <WorkModeConflictDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              handleCancel();
            }
          }}
          conflict={modeConflicts[currentConflictIndex]}
          modeConflicts={modeConflicts.map(conflict => ({
            conflict,
            dateStr: conflict.taskDate,
            newMode: conflict.workMode
          }))}
          userId={userId}
          onDateChange={handleDateChange}
          onCancel={handleCancel}
          onConfirm={handleConfirmAnyway}
          onConflictResolved={handleConflictResolved}
          conflictIndex={currentConflictIndex}
          totalConflicts={modeConflicts.length}
        />
      )}
    </div>
  );
}

