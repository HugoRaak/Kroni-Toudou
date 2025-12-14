import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCalendarData } from '../use-calendar-data';
import type { DayTasksData } from '@/components/calendar/views/day-view';
import type { CalendarTask } from '@/lib/calendar/calendar-utils';

const mockGetWorkdayAction = vi.fn();
const mockGetCalendarDayDataAction = vi.fn();
const mockGetCalendarRangeDataAction = vi.fn();
const mockCheckFutureTaskShiftsAction = vi.fn();
const mockShowTaskShiftAlerts = vi.fn();
const mockGetTodayTasksFromStorage = vi.fn();
const mockSaveTodayTasksToStorage = vi.fn();
const mockIsToday = vi.fn();

vi.mock('@/app/actions/workdays', () => ({
  getWorkdayAction: (...args: unknown[]) => mockGetWorkdayAction(...args),
}));

vi.mock('@/app/actions/calendar', () => ({
  getCalendarDayDataAction: (...args: unknown[]) => mockGetCalendarDayDataAction(...args),
  getCalendarRangeDataAction: (...args: unknown[]) => mockGetCalendarRangeDataAction(...args),
  checkFutureTaskShiftsAction: (...args: unknown[]) => mockCheckFutureTaskShiftsAction(...args),
}));

vi.mock('@/lib/calendar/task-shift-alerts', () => ({
  showTaskShiftAlerts: (...args: unknown[]) => mockShowTaskShiftAlerts(...args),
}));

vi.mock('@/lib/storage/localStorage-tasks', () => ({
  getTodayTasksFromStorage: (...args: unknown[]) => mockGetTodayTasksFromStorage(...args),
  saveTodayTasksToStorage: (...args: unknown[]) => mockSaveTodayTasksToStorage(...args),
  isToday: (...args: unknown[]) => mockIsToday(...args),
}));

const dayTasksData: DayTasksData = {
  periodic: [],
  specific: [],
  whenPossible: { inProgress: [], notStarted: [] },
  alerts: [],
};

const calendarRangeData = {
  tasksData: [{ id: '1', title: 'Task', description: '', type: 'specific' } as CalendarTask],
  workdays: { '2024-06-10': 'Présentiel' as const },
};

const defaultOptions = {
  userId: 'user1',
  currentView: 'today' as const,
  dayDate: new Date(2024, 5, 15),
  weekDate: new Date(2024, 5, 15),
  monthDate: new Date(2024, 5, 15),
};

describe('useCalendarData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached today tasks on subsequent loads when available', async () => {
    mockIsToday.mockReturnValue(true);

    mockGetTodayTasksFromStorage
      .mockReturnValueOnce(null) // first phase : no cache
      .mockReturnValueOnce(dayTasksData); // second phase : cache available

    mockGetCalendarDayDataAction.mockResolvedValue({
      dayData: dayTasksData,
      mode: 'Présentiel',
    });

    const { result } = renderHook(() => useCalendarData(defaultOptions));

    // 1st load (triggered by the useEffect + debounce 250ms)
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetCalendarDayDataAction).toHaveBeenCalledTimes(1);

    // 2nd load manually → must use the cache (no new API call)
    mockGetWorkdayAction.mockResolvedValueOnce('Présentiel');

    await act(async () => {
      await result.current.loadTasks(); // forceReload = false
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.dayTasks).toEqual(dayTasksData);
    expect(result.current.dayWorkMode).toBe('Présentiel');
    expect(mockGetCalendarDayDataAction).toHaveBeenCalledTimes(1);
  });

  it('should fetch day data and save to storage when cache is missing', async () => {
    mockIsToday.mockReturnValue(true);
    mockGetTodayTasksFromStorage.mockReturnValue(null);
    mockGetCalendarDayDataAction.mockResolvedValue({
      dayData: { ...dayTasksData, alerts: [{ taskId: '1' }] },
      mode: 'Distanciel',
    });
    mockCheckFutureTaskShiftsAction.mockResolvedValue({ alerts: [] });

    const { result } = renderHook(() => useCalendarData(defaultOptions));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dayTasks?.alerts).toHaveLength(1);
    expect(result.current.dayWorkMode).toBe('Distanciel');
    expect(mockSaveTodayTasksToStorage).toHaveBeenCalled();
    expect(mockShowTaskShiftAlerts).toHaveBeenCalledWith([{ taskId: '1' }]);
  });

  it('should fetch range data for week view', async () => {
    mockGetCalendarRangeDataAction.mockResolvedValue(calendarRangeData);
    const options = { ...defaultOptions, currentView: 'week' as const };

    const { result } = renderHook(() => useCalendarData(options));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toEqual(calendarRangeData.tasksData);
    expect(result.current.workdaysMap).toEqual(calendarRangeData.workdays);
    expect(mockGetCalendarRangeDataAction).toHaveBeenCalled();
  });

  it('should call checkFutureTaskShiftsAction when today cache is empty', async () => {
    mockIsToday.mockReturnValue(true);
    mockGetTodayTasksFromStorage.mockReturnValue(null);
    mockGetCalendarDayDataAction.mockResolvedValue({ dayData: dayTasksData, mode: 'Présentiel' });
    mockCheckFutureTaskShiftsAction.mockResolvedValue({ alerts: [{ taskId: 'future' }] });

    const { result } = renderHook(() => useCalendarData(defaultOptions));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCheckFutureTaskShiftsAction).toHaveBeenCalledWith({ userId: defaultOptions.userId });
    expect(mockShowTaskShiftAlerts).toHaveBeenCalledWith([{ taskId: 'future' }]);
  });

  ['task-created', 'task-updated', 'task-deleted'].forEach((eventName) => {
    it(`should force reload day data from server when ${eventName} event is dispatched`, async () => {
      mockIsToday.mockReturnValue(true);

      mockGetTodayTasksFromStorage
        .mockReturnValueOnce(null) // first phase
        .mockReturnValue(dayTasksData); // subsequent calls

      mockGetCalendarDayDataAction.mockResolvedValue({
        dayData: dayTasksData,
        mode: 'Présentiel',
      });
      mockCheckFutureTaskShiftsAction.mockResolvedValue({ alerts: [] });

      const { result } = renderHook(() => useCalendarData(defaultOptions));

      // 1st load
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockGetCalendarDayDataAction).toHaveBeenCalledTimes(1);

      // Dispatch the event → must call loadTasks(true) → new API call
      await act(async () => {
        window.dispatchEvent(new Event(eventName));
      });

      await waitFor(() => expect(mockGetCalendarDayDataAction).toHaveBeenCalledTimes(2));
    });
  });
});
