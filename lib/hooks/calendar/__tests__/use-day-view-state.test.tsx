import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDayViewState } from '../use-day-view-state';
import type { TaskWithType } from '@/lib/types';

const mockStorage = vi.hoisted(() => ({
  dayViewLayout: {
    get: vi.fn(() => 'single'),
    set: vi.fn(),
  },
}));

vi.mock('@/lib/storage/localStorage-helpers', () => ({
  storage: mockStorage,
}));

describe('useDayViewState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.dayViewLayout.get.mockReturnValue('single');
  });

  it('should initialize with single layout', () => {
    const { result } = renderHook(() => useDayViewState(true));

    expect(result.current.layout).toBe('single');
    expect(result.current.hideConfirmOpen).toBe(false);
    expect(result.current.taskToHide).toBeNull();
    expect(result.current.orderVersion).toBe(0);
  });

  it('should read layout from localStorage after mount', () => {
    mockStorage.dayViewLayout.get.mockReturnValue('three-column');

    const { result } = renderHook(() => useDayViewState(true));

    expect(mockStorage.dayViewLayout.get).toHaveBeenCalled();
    expect(result.current.layout).toBe('three-column');
  });

  it('should toggle layout between single and three-column', () => {
    const { result } = renderHook(() => useDayViewState(true));

    expect(result.current.layout).toBe('single');

    act(() => {
      result.current.handleToggleLayout();
    });

    expect(result.current.layout).toBe('three-column');
    expect(mockStorage.dayViewLayout.set).toHaveBeenCalledWith('three-column');

    act(() => {
      result.current.handleToggleLayout();
    });

    expect(result.current.layout).toBe('single');
    expect(mockStorage.dayViewLayout.set).toHaveBeenCalledWith('single');
  });

  it('should open hide confirm dialog when handleHideTaskClick is called', () => {
    const { result } = renderHook(() => useDayViewState(true));
    const task: TaskWithType = {
      id: '1',
      user_id: 'user-1',
      title: 'Test Task',
      description: '',
      taskType: 'periodic',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    act(() => {
      result.current.handleHideTaskClick(task);
    });

    expect(result.current.hideConfirmOpen).toBe(true);
    expect(result.current.taskToHide).toEqual(task);
  });

  it('should close hide confirm dialog when handleConfirmHide is called', () => {
    const { result } = renderHook(() => useDayViewState(true));
    const task: TaskWithType = {
      id: '1',
      user_id: 'user-1',
      title: 'Test Task',
      description: '',
      taskType: 'periodic',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    act(() => {
      result.current.handleHideTaskClick(task);
      result.current.handleConfirmHide();
    });

    expect(result.current.hideConfirmOpen).toBe(false);
    expect(result.current.taskToHide).toBeNull();
  });

  it('should close hide confirm dialog when handleCancelHide is called', () => {
    const { result } = renderHook(() => useDayViewState(true));
    const task: TaskWithType = {
      id: '1',
      user_id: 'user-1',
      title: 'Test Task',
      description: '',
      taskType: 'periodic',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    act(() => {
      result.current.handleHideTaskClick(task);
      result.current.handleCancelHide();
    });

    expect(result.current.hideConfirmOpen).toBe(false);
    expect(result.current.taskToHide).toBeNull();
  });

  it('should increment orderVersion when task-order-updated event is dispatched', () => {
    const { result } = renderHook(() => useDayViewState(true));

    expect(result.current.orderVersion).toBe(0);

    act(() => {
      window.dispatchEvent(new Event('task-order-updated'));
    });

    expect(result.current.orderVersion).toBe(1);

    act(() => {
      window.dispatchEvent(new Event('task-order-updated'));
    });

    expect(result.current.orderVersion).toBe(2);
  });

  it('should not listen to task-order-updated when not isTodayView', () => {
    const { result } = renderHook(() => useDayViewState(false));

    expect(result.current.orderVersion).toBe(0);

    act(() => {
      window.dispatchEvent(new Event('task-order-updated'));
    });

    // Should not increment because isTodayView is false
    expect(result.current.orderVersion).toBe(0);
  });

  it('should register and cleanup task-order-updated event listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useDayViewState(true));

    // We have registered a handler
    expect(addSpy).toHaveBeenCalledWith('task-order-updated', expect.any(Function));

    const handler = addSpy.mock.calls.find(
      ([eventName]) => eventName === 'task-order-updated',
    )?.[1] as EventListener;

    expect(handler).toBeDefined();

    unmount();

    // We cleaned up with the same handler
    expect(removeSpy).toHaveBeenCalledWith('task-order-updated', handler);
  });
});
