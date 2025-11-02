"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { setWorkdayForUserAction } from "@/app/actions/workdays";

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

  useEffect(() => {
    setSelectedMode(workMode);
  }, [workMode]);

  const handleClickBadge = () => {
    if (disabled) return;
    setSelectedMode(prev => cycleMode(prev));
  };

  const handleSave = async () => {
    if (selectedMode === workMode) return;
    setSaving(true);
    try {
      await setWorkdayForUserAction(date, selectedMode);
      onSaved?.();
    } finally {
      setSaving(false);
    }
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
    </div>
  );
}

