import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkdaysEditor } from '../use-workdays-editor';
import type { WorkMode } from '@/lib/db/workdays';

const mockSetWorkdayForUserAction = vi.fn();
const mockSetWorkdayForUserActionForce = vi.fn();
const mockSetWorkdaysForUserActionForceBatch = vi.fn();
const mockCheckWorkdayConflictsBatchForUserAction = vi.fn();
const mockGetCurrentUserIdAction = vi.fn();
const mockUpdateTaskAction = vi.fn();
const mockToastError = vi.fn();

const conflictsMock = {
  modeConflicts: [] as any[],
  currentConflictIndex: 0,
  confirmedConflicts: new Set<number>(),
  currentConflict: null as any,
  totalConflicts: 0,

  setModeConflicts: vi.fn((conflicts: any[]) => {
    conflictsMock.modeConflicts = conflicts;
    conflictsMock.totalConflicts = conflicts.length;
    // on aligne aussi currentConflict sur le premier conflit
    conflictsMock.currentConflictIndex = conflicts.length > 0 ? 0 : 0;
    conflictsMock.currentConflict = conflicts[0] ?? null;
  }),

  setCurrentConflictIndex: vi.fn((index: number) => {
    conflictsMock.currentConflictIndex = index;
    conflictsMock.currentConflict = conflictsMock.modeConflicts[index] ?? null;
  }),

  setConfirmedConflicts: vi.fn((set: Set<number>) => {
    conflictsMock.confirmedConflicts = set;
  }),

  resetConflicts: vi.fn(() => {
    conflictsMock.modeConflicts = [];
    conflictsMock.currentConflictIndex = 0;
    conflictsMock.currentConflict = null;
    conflictsMock.confirmedConflicts = new Set();
    conflictsMock.totalConflicts = 0;
  }),
};


vi.mock('@/app/actions/workdays', () => ({
  setWorkdayForUserAction: (...args: unknown[]) => mockSetWorkdayForUserAction(...args),
  setWorkdayForUserActionForce: (...args: unknown[]) => mockSetWorkdayForUserActionForce(...args),
  setWorkdaysForUserActionForceBatch: (...args: unknown[]) => mockSetWorkdaysForUserActionForceBatch(...args),
  checkWorkdayConflictsBatchForUserAction: (...args: unknown[]) => mockCheckWorkdayConflictsBatchForUserAction(...args),
}));

vi.mock('@/app/actions/tasks', () => ({
  getCurrentUserIdAction: (...args: unknown[]) => mockGetCurrentUserIdAction(...args),
  updateTaskAction: (...args: unknown[]) => mockUpdateTaskAction(...args),
}));

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils')>('@/lib/utils');
  return {
    ...actual,
    isPastDate: () => false,
    formatDateLocal: actual.formatDateLocal,
  };
});

vi.mock('../use-mode-conflicts', () => ({
  useModeConflicts: () => conflictsMock,
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
  },
}));

const baseWorkdays: Record<string, WorkMode> = {
  '2024-06-10': 'Présentiel',
};

describe('useWorkdaysEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetCurrentUserIdAction.mockResolvedValue(null);

    conflictsMock.modeConflicts = [];
    conflictsMock.currentConflictIndex = 0;
    conflictsMock.confirmedConflicts = new Set();
    conflictsMock.currentConflict = null;
    conflictsMock.totalConflicts = 0;
  });

  it('handleDayClick cycles mode when editing and not past date', () => {
    const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

    act(() => {
      result.current.handleStartEdit();
    });
  
    // give time to React to re-render the component
    act(() => {
      result.current.handleDayClick(new Date(2024, 5, 10));
    });

    const iso = '2024-06-10';
    expect(result.current.localWorkdays[iso]).toBe('Distanciel');
  });

  it('should not modify workday when clicking a past date', () => {
    // Override isPastDate to simulate past date
    vi.doMock('@/lib/utils', async () => {
      const actual = await vi.importActual('@/lib/utils');
      return { ...actual, isPastDate: () => true };
    });
  
    const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));
  
    act(() => {
      result.current.handleStartEdit();
      result.current.handleDayClick(new Date(2024, 5, 10));
    });
  
    // No change expected
    expect(result.current.localWorkdays['2024-06-10']).toBe('Présentiel');
  });  

  it('handleSave with no changes calls check conflicts and closes editing', async () => {
    mockCheckWorkdayConflictsBatchForUserAction.mockResolvedValue({});
    const onSaved = vi.fn();
    const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));

    await act(async () => {
      result.current.handleStartEdit();
      await result.current.handleSave();
    });

    expect(mockCheckWorkdayConflictsBatchForUserAction).toHaveBeenCalledWith([]);
    expect(onSaved).toHaveBeenCalled();
    expect(result.current.editing).toBe(false);
  });

  it('handleSave sets conflicts when returned by API', async () => {
    mockCheckWorkdayConflictsBatchForUserAction.mockResolvedValue({
      '2024-06-10': [{ type: 'MODE_CONFLICT', taskDate: '2024-06-10', taskMode: 'Présentiel', workMode: 'Distanciel' }],
    });
  
    const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));
  
    await act(async () => {
      result.current.handleStartEdit();
    });
  
    // give time to React to re-render the component
    await act(async () => {
      // toggle day to create change
      result.current.handleDayClick(new Date(2024, 5, 10));
      await result.current.handleSave();
    });
  
    expect(mockCheckWorkdayConflictsBatchForUserAction).toHaveBeenCalled();
  });
  

  it('handleCancelConflict resets conflicts, exits editing and calls onSaved when some changes were saved before conflicts', async () => {
    const baseWorkdays: Record<string, WorkMode> = {
      '2024-06-10': 'Présentiel',
      '2024-06-11': 'Présentiel',
    };
  
    const onSaved = vi.fn();
  
    const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));
  
    await act(async () => {
      result.current.handleStartEdit();
    });

    // give time to React to re-render the component
    await act(async () => {
      result.current.handleDayClick(new Date(2024, 5, 10));
      result.current.handleDayClick(new Date(2024, 5, 11));
    });
  
    mockCheckWorkdayConflictsBatchForUserAction.mockResolvedValue({
      '2024-06-10': [
        {
          type: 'MODE_CONFLICT',
          taskMode: 'Présentiel',
          taskDate: '2024-06-10',
          workMode: 'Distanciel',
        },
      ],
      '2024-06-11': [],
    });
  
    // The batch save of non-conflicts passes well
    mockSetWorkdaysForUserActionForceBatch.mockResolvedValue(true);
  
    // We save → non-conflicts saved, conflicts displayed
    await act(async () => {
      await result.current.handleSave();
    });
  
    // There should have been a batch save for the non-conflicts
    expect(mockSetWorkdaysForUserActionForceBatch).toHaveBeenCalledTimes(1);
  
    // The conflicts have been stored in the conflicts hook
    expect(conflictsMock.setModeConflicts).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ dateStr: '2024-06-10' }),
      ])
    );
    expect(conflictsMock.setCurrentConflictIndex).toHaveBeenCalledWith(0);
  
    // We are still in edit mode, and onSaved has not been called yet
    expect(result.current.editing).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();
  
    // The user cancels the resolution of conflicts
    await act(async () => {
      result.current.handleCancelConflict();
    });
  
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('handleCancel should reset state without calling onSaved when nothing was saved', () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));
  
    act(() => {
      result.current.handleStartEdit();
    });
  
    act(() => {
      result.current.handleCancel();
    });
  
    expect(result.current.editing).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('should initialize userId via getCurrentUserIdAction', async () => {
    mockGetCurrentUserIdAction.mockResolvedValue('user-123');
    const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

    await act(async () => {
      // Wait for useEffect to run
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockGetCurrentUserIdAction).toHaveBeenCalled();
    expect(result.current.userId).toBe('user-123');
  });

  it('should fallback to Présentiel when localWorkdays contains an invalid mode', () => {
    const workdays = {
      '2024-06-10': 'INVALID' as unknown as WorkMode,
    };
  
    const { result } = renderHook(() =>
      useWorkdaysEditor(workdays, vi.fn())
    );
  
    act(() => {
      result.current.handleStartEdit();
    });
  
    act(() => {
      result.current.handleDayClick(new Date(2024, 5, 10)); // 10/06/2024
    });
  
    expect(result.current.localWorkdays['2024-06-10']).toBe('Présentiel');
  });

  describe('handleDateChange', () => {
    it('should update task date when userId is available', async () => {
      mockGetCurrentUserIdAction.mockResolvedValue('user-123');
      mockUpdateTaskAction.mockResolvedValue({ id: 'task-1' });
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.handleDateChange('task-1', '2024-06-15');
      });

      expect(mockUpdateTaskAction).toHaveBeenCalledWith('task-1', { due_on: '2024-06-15' });
      expect(mockToastError).not.toHaveBeenCalled();
    });

    it('should not update task when userId is not available', async () => {
      mockGetCurrentUserIdAction.mockResolvedValue(null);
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.handleDateChange('task-1', '2024-06-15');
      });

      expect(mockUpdateTaskAction).not.toHaveBeenCalled();
    });

    it('should show error toast when update fails', async () => {
      mockGetCurrentUserIdAction.mockResolvedValue('user-123');
      mockUpdateTaskAction.mockResolvedValue(false);
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.handleDateChange('task-1', '2024-06-15');
      });

      expect(mockToastError).toHaveBeenCalledWith('Erreur lors de la modification de la date de la tâche');
    });
  });

  describe('handleConflictResolved', () => {
    beforeEach(() => {
      conflictsMock.currentConflictIndex = 0;
      conflictsMock.modeConflicts = [
        { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-10', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-10', newMode: 'Distanciel' as const },
        { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-11', taskMode: 'Présentiel' as const, workMode: 'Distanciel' as const }, dateStr: '2024-06-11', newMode: 'Présentiel' as const },
      ];
      conflictsMock.currentConflict = conflictsMock.modeConflicts[0];
      conflictsMock.totalConflicts = 2;
    });

    it('should save conflict successfully and move to next conflict', async () => {
      mockSetWorkdayForUserAction.mockResolvedValue(true);
      const onSaved = vi.fn();
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));

      await act(async () => {
        await result.current.handleConflictResolved();
      });

      expect(mockSetWorkdayForUserAction).toHaveBeenCalledWith('2024-06-10', 'Distanciel');
      expect(conflictsMock.setCurrentConflictIndex).toHaveBeenCalledWith(1);
      expect(onSaved).not.toHaveBeenCalled();
    });

    it('should save last conflict successfully and finish', async () => {
      conflictsMock.currentConflictIndex = 1;
      conflictsMock.currentConflict = conflictsMock.modeConflicts[1];
      conflictsMock.confirmedConflicts = new Set();
      mockSetWorkdayForUserAction.mockResolvedValue(true);
      const onSaved = vi.fn();
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));

      await act(async () => {
        await result.current.handleConflictResolved();
      });

      expect(mockSetWorkdayForUserAction).toHaveBeenCalledWith('2024-06-11', 'Présentiel');
      expect(conflictsMock.resetConflicts).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalled();
      expect(result.current.editing).toBe(false);
    });

    it('should use force when conflict persists after task move', async () => {
      mockSetWorkdayForUserAction.mockResolvedValue({ type: 'MODE_CONFLICT', taskDate: '2024-06-10', taskMode: 'Tous', workMode: 'Congé' });
      mockSetWorkdayForUserActionForce.mockResolvedValue(true);
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      await act(async () => {
        await result.current.handleConflictResolved();
      });

      expect(mockSetWorkdayForUserAction).toHaveBeenCalled();
      expect(mockSetWorkdayForUserActionForce).toHaveBeenCalledWith('2024-06-10', 'Distanciel');
      expect(conflictsMock.setCurrentConflictIndex).toHaveBeenCalledWith(1);
    });

    it('should show error when force save fails', async () => {
      mockSetWorkdayForUserAction.mockResolvedValue({ type: 'MODE_CONFLICT', taskDate: '2024-06-10', taskMode: 'Tous', workMode: 'Congé' });
      mockSetWorkdayForUserActionForce.mockResolvedValue(false);
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      await act(async () => {
        await result.current.handleConflictResolved();
      });

      expect(mockToastError).toHaveBeenCalledWith('Erreur lors de la modification du mode de travail');
    });

    it('should save confirmed conflicts when resolving last conflict', async () => {
      conflictsMock.currentConflictIndex = 1;
      conflictsMock.currentConflict = conflictsMock.modeConflicts[1];
      conflictsMock.confirmedConflicts = new Set([0]);
      mockSetWorkdayForUserAction.mockResolvedValue(true);
      mockSetWorkdaysForUserActionForceBatch.mockResolvedValue(true);
      const onSaved = vi.fn();
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));

      await act(async () => {
        await result.current.handleConflictResolved();
      });

      expect(mockSetWorkdaysForUserActionForceBatch).toHaveBeenCalledWith([
        { dateStr: '2024-06-10', newMode: 'Distanciel' },
      ]);
      expect(conflictsMock.resetConflicts).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalled();
    });

    it('should not process when no conflicts exist', async () => {
      conflictsMock.modeConflicts = [];
      conflictsMock.currentConflict = null;
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      await act(async () => {
        await result.current.handleConflictResolved();
      });

      expect(mockSetWorkdayForUserAction).not.toHaveBeenCalled();
    });
  });

  describe('handleConfirmAnyway', () => {
    beforeEach(() => {
      conflictsMock.currentConflictIndex = 0;
      conflictsMock.modeConflicts = [
        { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-10', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-10', newMode: 'Distanciel' as const },
        { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-11', taskMode: 'Présentiel' as const, workMode: 'Distanciel' as const }, dateStr: '2024-06-11', newMode: 'Présentiel' as const },
      ];
      conflictsMock.currentConflict = conflictsMock.modeConflicts[0];
      conflictsMock.totalConflicts = 2;
    });

    it('should mark current conflict as confirmed and move to next', () => {
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      act(() => {
        result.current.handleConfirmAnyway();
      });

      expect(conflictsMock.setConfirmedConflicts).toHaveBeenCalled();
      const callArgs = conflictsMock.setConfirmedConflicts.mock.calls[0][0];
      expect(callArgs.has(0)).toBe(true);
      expect(conflictsMock.setCurrentConflictIndex).toHaveBeenCalledWith(1);
    });

    it('should save all confirmed conflicts when last conflict is confirmed', async () => {
      conflictsMock.currentConflictIndex = 1;
      conflictsMock.currentConflict = conflictsMock.modeConflicts[1];
      conflictsMock.confirmedConflicts = new Set([0]);
      mockSetWorkdaysForUserActionForceBatch.mockResolvedValue(true);
      const onSaved = vi.fn();
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));

      await act(async () => {
        result.current.handleConfirmAnyway();
      });

      expect(mockSetWorkdaysForUserActionForceBatch).toHaveBeenCalledWith([
        { dateStr: '2024-06-10', newMode: 'Distanciel' },
        { dateStr: '2024-06-11', newMode: 'Présentiel' },
      ]);
      expect(conflictsMock.resetConflicts).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalled();
      expect(result.current.editing).toBe(false);
    });

    it('should show error when batch save fails', async () => {
      conflictsMock.currentConflictIndex = 1;
      conflictsMock.currentConflict = conflictsMock.modeConflicts[1];
      conflictsMock.confirmedConflicts = new Set([0]);
      mockSetWorkdaysForUserActionForceBatch.mockResolvedValue(false);
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      await act(async () => {
        result.current.handleConfirmAnyway();
      });

      expect(mockToastError).toHaveBeenCalledWith('Erreur lors de la modification du mode de travail');
    });

    it('should not process when no conflicts exist', () => {
      conflictsMock.modeConflicts = [];
      conflictsMock.currentConflict = null;
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      act(() => {
        result.current.handleConfirmAnyway();
      });

      expect(conflictsMock.setConfirmedConflicts).not.toHaveBeenCalled();
    });
  });

  describe('handleSkipConflict', () => {
    beforeEach(() => {
      conflictsMock.currentConflictIndex = 0;
      conflictsMock.modeConflicts = [
        { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-10', taskMode: 'Tous' as const, workMode: 'Congé' as const }, dateStr: '2024-06-10', newMode: 'Distanciel' as const },
        { conflict: { type: 'MODE_CONFLICT' as const, taskDate: '2024-06-11', taskMode: 'Présentiel' as const, workMode: 'Distanciel' as const }, dateStr: '2024-06-11', newMode: 'Présentiel' as const },
      ];
      conflictsMock.totalConflicts = 2;
    });

    it('should skip conflict and move to next', () => {
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, vi.fn()));

      act(() => {
        result.current.handleSkipConflict();
      });

      expect(conflictsMock.setCurrentConflictIndex).toHaveBeenCalledWith(1);
    });

    it('should finish when skipping last conflict', () => {
      conflictsMock.currentConflictIndex = 1;
      const onSaved = vi.fn();
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));

      act(() => {
        result.current.handleSkipConflict();
      });

      expect(conflictsMock.resetConflicts).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalled();
      expect(result.current.editing).toBe(false);
    });
  });

  describe('hasSavedChanges and onSaved behavior', () => {
    it('calls onSaved and exits editing when all changes are saved without conflicts', async () => {
      const baseWorkdays: Record<string, WorkMode> = {
        '2024-06-10': 'Présentiel',
      };
  
      const onSaved = vi.fn();
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));
  
      // We modify a day
      await act(async () => {
        result.current.handleStartEdit();
        result.current.handleDayClick(new Date(2024, 5, 10));
      });
  
      // No conflicts on this day
      mockCheckWorkdayConflictsBatchForUserAction.mockResolvedValue({
        '2024-06-10': [],
      });
      mockSetWorkdaysForUserActionForceBatch.mockResolvedValue(true);
  
      await act(async () => {
        await result.current.handleSave();
      });
  
      expect(result.current.editing).toBe(false);
      expect(onSaved).toHaveBeenCalledTimes(1);
  
      // If we call handleCancelConflict after, it should do nothing
      await act(async () => {
        result.current.handleCancelConflict();
      });
  
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  
    it('does not call onSaved after save when conflicts exist, but calls it once on cancel', async () => {
      const baseWorkdays: Record<string, WorkMode> = {
        '2024-06-10': 'Présentiel',
        '2024-06-11': 'Présentiel',
      };
  
      const onSaved = vi.fn();
      const { result } = renderHook(() => useWorkdaysEditor(baseWorkdays, onSaved));
  
      await act(async () => {
        result.current.handleStartEdit();
      });

      // give time to React to re-render the component
      await act(async () => {
        result.current.handleDayClick(new Date(2024, 5, 10));
        result.current.handleDayClick(new Date(2024, 5, 11));
      });
  
      mockCheckWorkdayConflictsBatchForUserAction.mockResolvedValue({
        '2024-06-10': [
          {
            type: 'MODE_CONFLICT',
            taskMode: 'Présentiel',
            taskDate: '2024-06-10',
            workMode: 'Distanciel',
          },
        ],
        '2024-06-11': [],
      });
      mockSetWorkdaysForUserActionForceBatch.mockResolvedValue(true);
  
      await act(async () => {
        await result.current.handleSave();
      });
  
      expect(mockSetWorkdaysForUserActionForceBatch).toHaveBeenCalledTimes(1);
      expect(conflictsMock.setModeConflicts).toHaveBeenCalled();
      expect(result.current.editing).toBe(true);
  
      expect(onSaved).not.toHaveBeenCalled();
  
      // The user cancels the resolution of conflicts
      await act(async () => {
        result.current.handleCancelConflict();
      });

      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });
});
