import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalendarHandlers } from '../use-calendar-handlers';
import type { DayTasksData } from '@/components/calendar/views/day-view';
import { ModeConflictError } from '@/app/actions/tasks';

const mockLoadTasks = vi.fn();
const mockSetDayTasks = vi.fn();
const mockSetDayWorkMode = vi.fn();
const mockOnUpdateTask = vi.fn();
const mockOnDeleteTask = vi.fn();

const mockGetCalendarDayDataAction = vi.fn();
const mockSaveTodayTasksToStorage = vi.fn();
const mockIsToday = vi.fn();
const mockShowTaskShiftAlerts = vi.fn();

vi.mock('@/app/actions/calendar', () => ({
  getCalendarDayDataAction: (...args: unknown[]) => mockGetCalendarDayDataAction(...args),
}));

vi.mock('@/lib/storage/localStorage-tasks', () => ({
  saveTodayTasksToStorage: (...args: unknown[]) => mockSaveTodayTasksToStorage(...args),
  isToday: (...args: unknown[]) => mockIsToday(...args),
}));

vi.mock('@/lib/calendar/task-shift-alerts', () => ({
  showTaskShiftAlerts: (...args: unknown[]) => mockShowTaskShiftAlerts(...args),
}));

const dayTasksData: DayTasksData = {
  periodic: [],
  specific: [],
  whenPossible: { inProgress: [], notStarted: [] },
  alerts: [],
};

const defaultOptions = {
  userId: 'user1',
  currentView: 'day' as const,
  dayDate: new Date(2024, 5, 15),
  loadTasks: mockLoadTasks,
  setDayTasks: mockSetDayTasks,
  setDayWorkMode: mockSetDayWorkMode,
  onUpdateTask: mockOnUpdateTask,
  onDeleteTask: mockOnDeleteTask,
};

describe('useCalendarHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handleModeSaved should force reload tasks', async () => {
    const { result } = renderHook(() => useCalendarHandlers(defaultOptions));

    await act(async () => {
      await result.current.handleModeSaved();
    });

    expect(mockLoadTasks).toHaveBeenCalledWith(true);
  });

  it('handleUpdateTask success on today should refresh cache and alerts', async () => {
    mockOnUpdateTask.mockResolvedValue(true);
    mockIsToday.mockReturnValue(true);
    mockGetCalendarDayDataAction.mockResolvedValue({ dayData: { ...dayTasksData, alerts: [{ taskId: '1' }] }, mode: 'Distanciel' });

    const { result } = renderHook(() => useCalendarHandlers(defaultOptions));

    await act(async () => {
      const formData = new FormData();
      await result.current.handleUpdateTask(formData);
    });

    expect(mockSaveTodayTasksToStorage).toHaveBeenCalled();
    expect(mockSetDayTasks).toHaveBeenCalledWith(expect.objectContaining({ alerts: [{ taskId: '1' }] }));
    expect(mockSetDayWorkMode).toHaveBeenCalledWith('Distanciel');
    expect(mockShowTaskShiftAlerts).toHaveBeenCalledWith([{ taskId: '1' }]);
    expect(mockLoadTasks).not.toHaveBeenCalled();
  });

  it('handleUpdateTask success on day (not today) should reload tasks', async () => {
    mockOnUpdateTask.mockResolvedValue(true);
    mockIsToday.mockReturnValue(false);

    const { result } = renderHook(() => useCalendarHandlers(defaultOptions));

    await act(async () => {
      const formData = new FormData();
      await result.current.handleUpdateTask(formData);
    });

    expect(mockLoadTasks).toHaveBeenCalled();
    expect(mockSaveTodayTasksToStorage).not.toHaveBeenCalled();
  });

  it('handleUpdateTask failure should return result without reload', async () => {
    mockOnUpdateTask.mockResolvedValue(false);
    mockIsToday.mockReturnValue(true);

    const { result } = renderHook(() => useCalendarHandlers(defaultOptions));

    let response: boolean | object = false;
    await act(async () => {
      const formData = new FormData();
      response = await result.current.handleUpdateTask(formData);
    });

    expect(response).toBe(false);
    expect(mockLoadTasks).not.toHaveBeenCalled();
    expect(mockSaveTodayTasksToStorage).not.toHaveBeenCalled();
  });

  it('handleDeleteTask success on today should refresh cache', async () => {
    mockOnDeleteTask.mockResolvedValue(true);
    mockIsToday.mockReturnValue(true);
    mockGetCalendarDayDataAction.mockResolvedValue({ dayData: dayTasksData, mode: 'Présentiel' });

    const { result } = renderHook(() => useCalendarHandlers(defaultOptions));

    await act(async () => {
      await result.current.handleDeleteTask('task-1');
    });

    expect(mockSaveTodayTasksToStorage).toHaveBeenCalledWith(dayTasksData);
    expect(mockSetDayTasks).toHaveBeenCalledWith(dayTasksData);
    expect(mockSetDayWorkMode).toHaveBeenCalledWith('Présentiel');
    expect(mockLoadTasks).not.toHaveBeenCalled();
  });

  it('handleDeleteTask success on day (not today) should reload tasks', async () => {
    mockOnDeleteTask.mockResolvedValue(true);
    mockIsToday.mockReturnValue(false);

    const { result } = renderHook(() => useCalendarHandlers(defaultOptions));

    await act(async () => {
      await result.current.handleDeleteTask('task-1');
    });

    expect(mockLoadTasks).toHaveBeenCalled();
    expect(mockSaveTodayTasksToStorage).not.toHaveBeenCalled();
  });

  it('handleDeleteTask failure should return false without reload', async () => {
    mockOnDeleteTask.mockResolvedValue(false);
    mockIsToday.mockReturnValue(true);

    const { result } = renderHook(() => useCalendarHandlers(defaultOptions));

    let response = true;
    await act(async () => {
      response = await result.current.handleDeleteTask('task-1');
    });

    expect(response).toBe(false);
    expect(mockLoadTasks).not.toHaveBeenCalled();
    expect(mockSaveTodayTasksToStorage).not.toHaveBeenCalled();
  });

  it('handleUpdateTask with ModeConflictError should return error without reload', async () => {
    const conflict = { type: 'MODE_CONFLICT', taskDate: '2024-06-10', taskMode: 'Tous', workMode: 'Congé' } as const;
    mockOnUpdateTask.mockResolvedValue(conflict);
    mockIsToday.mockReturnValue(true);
  
    const { result } = renderHook(() => useCalendarHandlers(defaultOptions));
  
    let response: boolean | ModeConflictError = false;
    await act(async () => {
      const formData = new FormData();
      response = await result.current.handleUpdateTask(formData);
    });
  
    expect(response).toBe(conflict);
    expect(mockLoadTasks).not.toHaveBeenCalled();
    expect(mockSaveTodayTasksToStorage).not.toHaveBeenCalled();
  });

  it('handleUpdateTask success on non day-like view should not reload or touch cache', async () => {
    mockOnUpdateTask.mockResolvedValue(true);
    mockIsToday.mockReturnValue(true);
  
    const { result } = renderHook(() =>
      useCalendarHandlers({ 
        ...defaultOptions, 
        currentView: 'month' as const,
      })
    );
  
    await act(async () => {
      const formData = new FormData();
      await result.current.handleUpdateTask(formData);
    });
  
    expect(mockLoadTasks).not.toHaveBeenCalled();
    expect(mockSaveTodayTasksToStorage).not.toHaveBeenCalled();
    expect(mockSetDayTasks).not.toHaveBeenCalled();
    expect(mockSetDayWorkMode).not.toHaveBeenCalled();
  });  
});
