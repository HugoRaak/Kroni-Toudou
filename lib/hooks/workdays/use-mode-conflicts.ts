"use client";

import { useState } from 'react';
import type { ModeConflictError } from '@/app/actions/tasks';
import type { WorkMode } from '@/lib/db/workdays';

export type ModeConflict = {
  conflict: ModeConflictError;
  dateStr: string;
  newMode: WorkMode;
};

type UseModeConflictsReturn = {
  modeConflicts: ModeConflict[];
  currentConflictIndex: number;
  confirmedConflicts: Set<number>;
  currentConflict: ModeConflict | null;
  totalConflicts: number;
  setModeConflicts: (conflicts: ModeConflict[]) => void;
  setCurrentConflictIndex: (index: number) => void;
  setConfirmedConflicts: (confirmed: Set<number>) => void;
  handleConfirmConflict: (index: number) => void;
  handleSkipConflict: () => void;
  resetConflicts: () => void;
};

export function useModeConflicts(): UseModeConflictsReturn {
  const [modeConflicts, setModeConflicts] = useState<ModeConflict[]>([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState<number>(0);
  const [confirmedConflicts, setConfirmedConflicts] = useState<Set<number>>(new Set());

  const currentConflict = modeConflicts.length > 0 && currentConflictIndex < modeConflicts.length 
    ? modeConflicts[currentConflictIndex] 
    : null;

  const handleConfirmConflict = (index: number) => {
    const newConfirmed = new Set(confirmedConflicts);
    newConfirmed.add(index);
    setConfirmedConflicts(newConfirmed);
  };

  const handleSkipConflict = () => {
    if (currentConflictIndex < modeConflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
    }
  };

  const resetConflicts = () => {
    setModeConflicts([]);
    setCurrentConflictIndex(0);
    setConfirmedConflicts(new Set());
  };

  return {
    modeConflicts,
    currentConflictIndex,
    confirmedConflicts,
    currentConflict,
    totalConflicts: modeConflicts.length,
    setModeConflicts,
    setCurrentConflictIndex,
    setConfirmedConflicts,
    handleConfirmConflict,
    handleSkipConflict,
    resetConflicts,
  };
}

