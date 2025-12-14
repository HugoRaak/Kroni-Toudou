import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDayTasksPreparation } from '../use-day-tasks-preparation';
import type { DayTasksData } from '@/components/calendar/views/day-view';
import type { Task, TempTask } from '@/lib/types';

const mockPrepareTasksForToday = vi.fn();
const mockGetTodayHiddenTaskIds = vi.fn();

vi.mock('@/lib/tasks/processing/task-preparation', () => ({
  prepareTasksForToday: (...args: unknown[]) => mockPrepareTasksForToday(...args),
}));

vi.mock('@/lib/storage/localStorage-tasks', () => ({
  getTodayHiddenTaskIds: (...args: unknown[]) => mockGetTodayHiddenTaskIds(...args),
}));

const defaultTasks: DayTasksData = {
  periodic: [],
  specific: [],
  whenPossible: {
    inProgress: [],
    notStarted: [],
  },
  alerts: [],
};

describe('useDayTasksPreparation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTodayHiddenTaskIds.mockReturnValue([]);
    mockPrepareTasksForToday.mockReturnValue([]);
  });

  it('should return empty preparedTasks when tasks is null', () => {
    const { result } = renderHook(() =>
      useDayTasksPreparation(null, [], true, false, 0, () => [], 'single'),
    );

    expect(result.current.preparedTasks).toEqual([]);
    expect(mockPrepareTasksForToday).not.toHaveBeenCalled();
  });

  it('should return empty preparedTasks when not isTodayView', () => {
    const { result } = renderHook(() =>
      useDayTasksPreparation(defaultTasks, [], false, false, 0, () => [], 'single'),
    );

    expect(result.current.preparedTasks).toEqual([]);
    expect(mockPrepareTasksForToday).not.toHaveBeenCalled();
  });

  it('should return empty preparedTasks when loading', () => {
    const { result } = renderHook(() =>
      useDayTasksPreparation(defaultTasks, [], true, true, 0, () => [], 'single'),
    );

    expect(result.current.preparedTasks).toEqual([]);
    expect(mockPrepareTasksForToday).not.toHaveBeenCalled();
  });

  it('should call prepareTasksForToday with correct arguments when conditions are met', () => {
    const tasks: DayTasksData = {
      ...defaultTasks,
      periodic: [
        {
          id: '1',
          title: 'Task 1',
          description: '',
          user_id: 'user1',
          created_at: '',
          updated_at: '',
        } as Task,
      ],
    };
    const tempTasks: TempTask[] = [
      { id: 'temp-1', title: 'Temp Task', description: '', created_at: '' },
    ];
    const getHiddenTempTaskIds = vi.fn(() => ['temp-1']);

    mockGetTodayHiddenTaskIds.mockReturnValue(['1']);
    mockPrepareTasksForToday.mockReturnValue([{ id: '1', title: 'Task 1', taskType: 'periodic' }]);

    renderHook(() =>
      useDayTasksPreparation(tasks, tempTasks, true, false, 0, getHiddenTempTaskIds, 'single'),
    );

    expect(mockGetTodayHiddenTaskIds).toHaveBeenCalled();
    expect(getHiddenTempTaskIds).toHaveBeenCalled();
    expect(mockPrepareTasksForToday).toHaveBeenCalledWith(
      tasks,
      tempTasks,
      ['1'],
      ['temp-1'],
      true,
      false,
    );
  });

  it('should return groupedPreparedTasks as null when layout is single', () => {
    const { result } = renderHook(() =>
      useDayTasksPreparation(defaultTasks, [], true, false, 0, () => [], 'single'),
    );

    expect(result.current.groupedPreparedTasks).toBeNull();
  });

  it('should return groupedPreparedTasks as null when not isTodayView', () => {
    mockPrepareTasksForToday.mockReturnValue([{ id: '1', title: 'Task 1', taskType: 'periodic' }]);

    const { result } = renderHook(() =>
      useDayTasksPreparation(defaultTasks, [], false, false, 0, () => [], 'three-column'),
    );

    expect(result.current.groupedPreparedTasks).toBeNull();
  });

  it('should return groupedPreparedTasks as null when preparedTasks is empty', () => {
    mockPrepareTasksForToday.mockReturnValue([]);

    const { result } = renderHook(() =>
      useDayTasksPreparation(defaultTasks, [], true, false, 0, () => [], 'three-column'),
    );

    expect(result.current.groupedPreparedTasks).toBeNull();
  });

  it('should group preparedTasks correctly for three-column layout', () => {
    mockPrepareTasksForToday.mockReturnValue([
      { id: '1', title: 'Task 1', taskType: 'periodic' },
      { id: '2', title: 'Task 2', taskType: 'specific' },
      { id: 'temp-1', title: 'Temp Task', taskType: 'temp' },
    ]);

    const { result } = renderHook(() =>
      useDayTasksPreparation(defaultTasks, [], true, false, 0, () => [], 'three-column'),
    );

    expect(result.current.groupedPreparedTasks).toEqual({
      periodic: [
        { id: '1', title: 'Task 1', taskType: 'periodic' },
        { id: 'temp-1', title: 'Temp Task', taskType: 'temp' },
      ],
      specific: [{ id: '2', title: 'Task 2', taskType: 'specific' }],
      temp: [],
    });
  });

  it('should update preparedTasks when orderVersion changes', () => {
    mockPrepareTasksForToday.mockReturnValue([{ id: '1', title: 'Task 1', taskType: 'periodic' }]);

    const { result, rerender } = renderHook(
      ({ orderVersion }) =>
        useDayTasksPreparation(defaultTasks, [], true, false, orderVersion, () => [], 'single'),
      { initialProps: { orderVersion: 0 } },
    );

    expect(result.current.preparedTasks).toHaveLength(1);

    rerender({ orderVersion: 1 });

    expect(mockPrepareTasksForToday).toHaveBeenCalledTimes(2);
  });
});
