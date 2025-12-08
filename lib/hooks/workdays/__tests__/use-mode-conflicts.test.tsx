import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModeConflicts } from '../use-mode-conflicts';

describe('useModeConflicts', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useModeConflicts());

    expect(result.current.modeConflicts).toEqual([]);
    expect(result.current.currentConflictIndex).toBe(0);
    expect(result.current.confirmedConflicts.size).toBe(0);
    expect(result.current.currentConflict).toBeNull();
    expect(result.current.totalConflicts).toBe(0);
  });

  it('should set conflicts and update derived values', () => {
    const { result } = renderHook(() => useModeConflicts());

    const conflicts = [
      { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-10', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-10', newMode: 'Présentiel' as const },
      { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-11', taskMode: 'Présentiel' as const, workMode: 'Distanciel' as const }, dateStr: '2024-06-11', newMode: 'Distanciel' as const },
    ];

    act(() => {
      result.current.setModeConflicts(conflicts);
    });

    expect(result.current.modeConflicts).toEqual(conflicts);
    expect(result.current.totalConflicts).toBe(2);
    expect(result.current.currentConflict).toEqual(conflicts[0]);
  });

  it('should confirm conflict and add to confirmed set', () => {
    const { result } = renderHook(() => useModeConflicts());

    act(() => {
      result.current.setModeConflicts([{ conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-10', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-10', newMode: 'Présentiel' as const }]);
      result.current.handleConfirmConflict(0);
    });

    expect(result.current.confirmedConflicts.has(0)).toBe(true);
  });

  it('should skip conflict and advance index', () => {
    const { result } = renderHook(() => useModeConflicts());

    act(() => {
      result.current.setModeConflicts([
        { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-10', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-10', newMode: 'Présentiel' as const },
        { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-11', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-11', newMode: 'Distanciel' as const },
      ]);
    });

    expect(result.current.modeConflicts).toHaveLength(2);
    expect(result.current.currentConflictIndex).toBe(0);

    act(() => {
      result.current.handleSkipConflict();
    });

    expect(result.current.currentConflictIndex).toBe(1);
    expect(result.current.currentConflict?.dateStr).toBe('2024-06-11');
  });

  it('should not advance index when already at last conflict', () => {
    const { result } = renderHook(() => useModeConflicts());
  
    act(() => {
      result.current.setModeConflicts([
        { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-10', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-10', newMode: 'Présentiel' as const },
      ]);
      // We try to skip when there is only one conflict
      result.current.handleSkipConflict();
    });
  
    expect(result.current.currentConflictIndex).toBe(0);
    expect(result.current.currentConflict?.dateStr).toBe('2024-06-10');
  });

  it('should reset conflicts', () => {
    const { result } = renderHook(() => useModeConflicts());

    act(() => {
      result.current.setModeConflicts([{ conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-10', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-10', newMode: 'Présentiel' as const }]);
      result.current.handleConfirmConflict(0);
      result.current.resetConflicts();
    });

    expect(result.current.modeConflicts).toEqual([]);
    expect(result.current.currentConflictIndex).toBe(0);
    expect(result.current.confirmedConflicts.size).toBe(0);
    expect(result.current.currentConflict).toBeNull();
    expect(result.current.totalConflicts).toBe(0);
  });

  it('should allow manual change of currentConflictIndex', () => {
    const { result } = renderHook(() => useModeConflicts());
  
    const conflicts = [
      { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-10', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-10', newMode: 'Présentiel' as const },
      { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-11', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-11', newMode: 'Distanciel' as const },
    ];
  
    act(() => {
      result.current.setModeConflicts(conflicts);
      result.current.setCurrentConflictIndex(1);
    });
  
    expect(result.current.currentConflictIndex).toBe(1);
    expect(result.current.currentConflict).toEqual(conflicts[1]);
  });

  it('should replace confirmedConflicts when using setConfirmedConflicts', () => {
    const { result } = renderHook(() => useModeConflicts());
  
    act(() => {
      result.current.setConfirmedConflicts(new Set([1, 2]));
    });
  
    expect(result.current.confirmedConflicts.has(1)).toBe(true);
    expect(result.current.confirmedConflicts.has(2)).toBe(true);
    expect(result.current.confirmedConflicts.size).toBe(2);
  });
});
