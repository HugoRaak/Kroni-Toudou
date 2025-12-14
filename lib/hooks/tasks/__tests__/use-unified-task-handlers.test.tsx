import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnifiedTaskHandlers } from '../use-unified-task-handlers';

const mockOnUpdateTask = vi.fn();
const mockOnDeleteTask = vi.fn();
const mockLoadTempTasks = vi.fn();
const mockUpdateTodayTempTask = vi.fn();
const mockDeleteTodayTempTask = vi.fn();

vi.mock('@/lib/storage/localStorage-tasks', () => ({
  updateTodayTempTask: (...args: unknown[]) => mockUpdateTodayTempTask(...args),
  deleteTodayTempTask: (...args: unknown[]) => mockDeleteTodayTempTask(...args),
}));

describe('useUnifiedTaskHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates temp task and refreshes temp list', async () => {
    mockUpdateTodayTempTask.mockReturnValue({
      id: 'temp-1',
      title: 'Updated',
      description: 'Desc',
    });

    const { result } = renderHook(() =>
      useUnifiedTaskHandlers({
        onUpdateTask: mockOnUpdateTask,
        onDeleteTask: mockOnDeleteTask,
        loadTempTasks: mockLoadTempTasks,
      }),
    );

    const formData = new FormData();
    formData.append('id', 'temp-1');
    formData.append('title', 'Updated');
    formData.append('description', 'Desc');

    let response;
    await act(async () => {
      response = await result.current.handleUpdateTaskUnified(formData);
    });

    expect(response).toBe(true);
    expect(mockUpdateTodayTempTask).toHaveBeenCalledWith('temp-1', {
      title: 'Updated',
      description: 'Desc',
    });
    expect(mockLoadTempTasks).toHaveBeenCalled();
  });

  it('returns false when temp task update fails', async () => {
    mockUpdateTodayTempTask.mockReturnValue(null);

    const { result } = renderHook(() =>
      useUnifiedTaskHandlers({
        onUpdateTask: mockOnUpdateTask,
        onDeleteTask: mockOnDeleteTask,
        loadTempTasks: mockLoadTempTasks,
      }),
    );

    const formData = new FormData();
    formData.append('id', 'temp-1');
    formData.append('title', 'Updated');

    let response: boolean | object = true;
    await act(async () => {
      response = await result.current.handleUpdateTaskUnified(formData);
    });

    expect(response).toBe(false);
    expect(mockLoadTempTasks).not.toHaveBeenCalled();
  });

  it('delegates update to onUpdateTask for non-temp tasks', async () => {
    mockOnUpdateTask.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useUnifiedTaskHandlers({
        onUpdateTask: mockOnUpdateTask,
        onDeleteTask: mockOnDeleteTask,
        loadTempTasks: mockLoadTempTasks,
      }),
    );

    const formData = new FormData();
    formData.append('id', 'task-1');

    let response;
    await act(async () => {
      response = await result.current.handleUpdateTaskUnified(formData);
    });

    expect(response).toBe(true);
    expect(mockOnUpdateTask).toHaveBeenCalledWith(formData);
  });

  it('deletes temp task and refreshes temp list', async () => {
    mockDeleteTodayTempTask.mockReturnValue(true);

    const { result } = renderHook(() =>
      useUnifiedTaskHandlers({
        onUpdateTask: mockOnUpdateTask,
        onDeleteTask: mockOnDeleteTask,
        loadTempTasks: mockLoadTempTasks,
      }),
    );

    let response;
    await act(async () => {
      response = await result.current.handleDeleteTaskUnified('temp-1');
    });

    expect(response).toBe(true);
    expect(mockDeleteTodayTempTask).toHaveBeenCalledWith('temp-1');
    expect(mockLoadTempTasks).toHaveBeenCalled();
  });

  it('returns false when temp task delete fails', async () => {
    mockDeleteTodayTempTask.mockReturnValue(false);

    const { result } = renderHook(() =>
      useUnifiedTaskHandlers({
        onUpdateTask: mockOnUpdateTask,
        onDeleteTask: mockOnDeleteTask,
        loadTempTasks: mockLoadTempTasks,
      }),
    );

    let response = true;
    await act(async () => {
      response = await result.current.handleDeleteTaskUnified('temp-1');
    });

    expect(response).toBe(false);
    expect(mockLoadTempTasks).not.toHaveBeenCalled();
  });

  it('delegates delete to onDeleteTask for non-temp tasks', async () => {
    mockOnDeleteTask.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useUnifiedTaskHandlers({
        onUpdateTask: mockOnUpdateTask,
        onDeleteTask: mockOnDeleteTask,
        loadTempTasks: mockLoadTempTasks,
      }),
    );

    let response;
    await act(async () => {
      response = await result.current.handleDeleteTaskUnified('task-1');
    });

    expect(response).toBe(true);
    expect(mockOnDeleteTask).toHaveBeenCalledWith('task-1');
  });

  it('dispatches temp-task-updated event when temp task is updated successfully', async () => {
    mockUpdateTodayTempTask.mockReturnValue({ id: 'temp-1' });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const { result } = renderHook(() =>
      useUnifiedTaskHandlers({
        onUpdateTask: mockOnUpdateTask,
        onDeleteTask: mockOnDeleteTask,
        loadTempTasks: mockLoadTempTasks,
      }),
    );

    const formData = new FormData();
    formData.append('id', 'temp-1');

    let response;
    await act(async () => {
      response = await result.current.handleUpdateTaskUnified(formData);
    });

    expect(response).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy.mock.calls[0][0]).toBeInstanceOf(Event);
    expect((dispatchSpy.mock.calls[0][0] as Event).type).toBe('temp-task-updated');
  });
});
