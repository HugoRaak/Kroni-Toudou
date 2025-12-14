import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTempTasks } from '../use-temp-tasks';
import type { TempTask } from '@/lib/types';

const mockGetTodayTempTasks = vi.fn();
const mockGetTodayHiddenTempTaskIds = vi.fn();
const mockFilterTasksByWorkMode = vi.fn();

vi.mock('@/lib/storage/localStorage-tasks', () => ({
  getTodayTempTasks: (...args: unknown[]) => mockGetTodayTempTasks(...args),
  getTodayHiddenTempTaskIds: (...args: unknown[]) => mockGetTodayHiddenTempTaskIds(...args),
}));

vi.mock('@/lib/calendar/calendar-utils', () => ({
  filterTasksByWorkMode: (...args: unknown[]) => mockFilterTasksByWorkMode(...args),
}));

describe('useTempTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTodayTempTasks.mockReturnValue([]);
    mockGetTodayHiddenTempTaskIds.mockReturnValue([]);
    mockFilterTasksByWorkMode.mockImplementation((tasks) => tasks);
  });

  it('should return empty tempTasks when not isTodayView', () => {
    const { result } = renderHook(() => useTempTasks(false, 'Présentiel'));

    expect(result.current.tempTasks).toEqual([]);
    expect(mockGetTodayTempTasks).not.toHaveBeenCalled();
  });

  it('should load temp tasks when isTodayView is true', () => {
    const tempTasks: TempTask[] = [
      { id: 'temp-1', title: 'Task 1', description: '', created_at: '2024-01-01' },
      { id: 'temp-2', title: 'Task 2', description: '', created_at: '2024-01-02' },
    ];
    mockGetTodayTempTasks.mockReturnValue(tempTasks);
    mockFilterTasksByWorkMode.mockReturnValue(tempTasks);

    const { result } = renderHook(() => useTempTasks(true, 'Présentiel'));

    expect(mockGetTodayTempTasks).toHaveBeenCalled();
    expect(mockFilterTasksByWorkMode).toHaveBeenCalledWith(tempTasks, 'Présentiel');
    expect(result.current.tempTasks).toEqual(tempTasks);
  });

  it('should filter temp tasks by work mode', () => {
    const allTempTasks: TempTask[] = [
      {
        id: 'temp-1',
        title: 'Task 1',
        description: '',
        created_at: '2024-01-01',
        mode: 'Présentiel',
      },
      {
        id: 'temp-2',
        title: 'Task 2',
        description: '',
        created_at: '2024-01-02',
        mode: 'Distanciel',
      },
    ];
    const filteredTasks: TempTask[] = [allTempTasks[0]];

    mockGetTodayTempTasks.mockReturnValue(allTempTasks);
    mockFilterTasksByWorkMode.mockReturnValue(filteredTasks);

    const { result } = renderHook(() => useTempTasks(true, 'Présentiel'));

    expect(result.current.tempTasks).toEqual(filteredTasks);
  });

  it('should reload temp tasks when loadTempTasks is called', () => {
    const initialTasks: TempTask[] = [
      { id: 'temp-1', title: 'Task 1', description: '', created_at: '2024-01-01' },
    ];
    const updatedTasks: TempTask[] = [
      { id: 'temp-1', title: 'Task 1', description: '', created_at: '2024-01-01' },
      { id: 'temp-2', title: 'Task 2', description: '', created_at: '2024-01-02' },
    ];

    mockGetTodayTempTasks.mockReturnValueOnce(initialTasks).mockReturnValueOnce(updatedTasks);
    mockFilterTasksByWorkMode.mockReturnValueOnce(initialTasks).mockReturnValueOnce(updatedTasks);

    const { result } = renderHook(() => useTempTasks(true, 'Présentiel'));

    expect(result.current.tempTasks).toEqual(initialTasks);

    act(() => {
      result.current.loadTempTasks();
    });

    expect(result.current.tempTasks).toEqual(updatedTasks);
  });

  it('should not read temp tasks from storage when loadTempTasks is called and not isTodayView', () => {
    const { result } = renderHook(() => useTempTasks(false, 'Présentiel'));

    act(() => {
      result.current.loadTempTasks();
    });

    expect(result.current.tempTasks).toEqual([]);
    expect(mockGetTodayTempTasks).not.toHaveBeenCalled();
  });

  it('should update temp tasks when temp-task-updated event is dispatched', () => {
    const initialTasks: TempTask[] = [
      { id: 'temp-1', title: 'Task 1', description: '', created_at: '2024-01-01' },
    ];
    const updatedTasks: TempTask[] = [
      { id: 'temp-1', title: 'Task 1', description: '', created_at: '2024-01-01' },
      { id: 'temp-2', title: 'Task 2', description: '', created_at: '2024-01-02' },
    ];

    mockGetTodayTempTasks.mockReturnValueOnce(initialTasks).mockReturnValue(updatedTasks);
    mockFilterTasksByWorkMode.mockReturnValueOnce(initialTasks).mockReturnValue(updatedTasks);

    const { result } = renderHook(() => useTempTasks(true, 'Présentiel'));

    expect(result.current.tempTasks).toEqual(initialTasks);

    act(() => {
      window.dispatchEvent(new Event('temp-task-updated'));
    });

    expect(result.current.tempTasks).toEqual(updatedTasks);
  });

  it('should not update temp tasks when temp-task-updated event is dispatched and not isTodayView', () => {
    const { result } = renderHook(() => useTempTasks(false, 'Présentiel'));

    expect(result.current.tempTasks).toEqual([]);

    act(() => {
      window.dispatchEvent(new Event('temp-task-updated'));
    });

    expect(result.current.tempTasks).toEqual([]);
    expect(mockGetTodayTempTasks).not.toHaveBeenCalled();
  });

  it('should return hidden temp task ids when getHiddenTempTaskIds is called and isTodayView', () => {
    mockGetTodayHiddenTempTaskIds.mockReturnValue(['temp-1', 'temp-2']);

    const { result } = renderHook(() => useTempTasks(true, 'Présentiel'));

    const hiddenIds = result.current.getHiddenTempTaskIds();

    expect(hiddenIds).toEqual(['temp-1', 'temp-2']);
    expect(mockGetTodayHiddenTempTaskIds).toHaveBeenCalled();
  });

  it('should return empty array when getHiddenTempTaskIds is called and not isTodayView', () => {
    const { result } = renderHook(() => useTempTasks(false, 'Présentiel'));

    const hiddenIds = result.current.getHiddenTempTaskIds();

    expect(hiddenIds).toEqual([]);
    expect(mockGetTodayHiddenTempTaskIds).not.toHaveBeenCalled();
  });

  it('should reload temp tasks when workMode changes', () => {
    const { rerender } = renderHook(
      ({ workMode }: { workMode: 'Présentiel' | 'Distanciel' | 'Congé' }) =>
        useTempTasks(true, workMode),
      { initialProps: { workMode: 'Présentiel' } },
    );

    expect(mockGetTodayTempTasks).toHaveBeenCalled();

    rerender({ workMode: 'Distanciel' });

    expect(mockGetTodayTempTasks).toHaveBeenCalledTimes(2);
  });
});
