import { useState, useEffect } from 'react';
import { setWorkdayForUserAction } from '@/app/actions/workdays';
import { formatDateLocal } from '@/lib/utils';

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

  useEffect(() => {
    if (!editing) setLocalWorkdays(workdays);
  }, [workdays, editing]);

  const cycleMode = (mode: WorkMode): WorkMode => {
    if (mode === 'Présentiel') return 'Distanciel';
    if (mode === 'Distanciel') return 'Congé';
    return 'Présentiel';
  };

  const handleDayClick = (dateObj: Date) => {
    if (editing) {
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
      const promises: Promise<boolean>[] = [];
      
      if (getDatesToSave) {
        // Use custom date range (e.g., for month view)
        const dates = getDatesToSave();
        for (const date of dates) {
          const iso = formatDateLocal(date);
          const from = workdays[iso] ?? 'Présentiel';
          const to = localWorkdays[iso] ?? 'Présentiel';
          if (from !== to) {
            promises.push(setWorkdayForUserAction(date, to));
          }
        }
      } else {
        // Use all changed workdays (e.g., for week view)
        for (const [iso, to] of Object.entries(localWorkdays)) {
          const from = workdays[iso] ?? 'Présentiel';
          if (from !== to) {
            // Parse date string (YYYY-MM-DD) to Date object without timezone issues
            const [year, month, day] = iso.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            promises.push(setWorkdayForUserAction(date, to));
          }
        }
      }
      
      await Promise.all(promises);
      onSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

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
  };
}

