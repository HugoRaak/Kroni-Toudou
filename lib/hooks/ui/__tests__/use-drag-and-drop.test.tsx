import type { DragEvent } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragAndDrop } from '../use-drag-and-drop';

const mockSaveTodayTaskOrder = vi.fn();

vi.mock('@/lib/storage/localStorage-tasks', () => ({
  saveTodayTaskOrder: (...args: unknown[]) => mockSaveTodayTaskOrder(...args),
}));

type TestItem = {
  id: string;
  title: string;
};

describe('useDragAndDrop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with provided items', () => {
    const initialItems: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    const { result } = renderHook(() => useDragAndDrop(initialItems));

    expect(result.current.items).toEqual(initialItems);
    expect(result.current.draggedIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
    expect(result.current.dropPosition).toBeNull();
  });

  it('should update items when initialItems change', () => {
    const initialItems: TestItem[] = [{ id: '1', title: 'Item 1' }];
    const { result, rerender } = renderHook(
      ({ items }) => useDragAndDrop(items),
      { initialProps: { items: initialItems } }
    );

    const newItems: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    rerender({ items: newItems });

    expect(result.current.items).toEqual(newItems);
  });

  it('should set draggedIndex when handleDragStart is called', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    act(() => {
      result.current.handleDragStart(0);
    });

    expect(result.current.draggedIndex).toBe(0);
  });

  it('should set dragOverIndex and dropPosition when handleDropZoneDragOver is called', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    act(() => {
      result.current.handleDragStart(0);
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;

    act(() => {
      result.current.handleDropZoneDragOver(mockEvent, 1, 'after');
    });

    expect(result.current.dragOverIndex).toBe(1);
    expect(result.current.dropPosition).toBe('after');
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should reorder items when handleDropZoneDrop is called', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
      { id: '3', title: 'Item 3' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    act(() => {
      result.current.handleDragStart(0);
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;

    act(() => {
      result.current.handleDropZoneDrop(mockEvent, 2, 'after');
    });

    expect(result.current.items).toEqual([
      { id: '2', title: 'Item 2' },
      { id: '3', title: 'Item 3' },
      { id: '1', title: 'Item 1' },
    ]);
    expect(result.current.draggedIndex).toBeNull();
  });

  it('should save order to localStorage when drop is completed', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    act(() => {
      result.current.handleDragStart(0);
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;

    act(() => {
      result.current.handleDropZoneDrop(mockEvent, 1, 'after');
    });

    expect(mockSaveTodayTaskOrder).toHaveBeenCalledWith(['2', '1']);
  });

  it('should dispatch task-order-updated event when drop is completed', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    act(() => {
      result.current.handleDragStart(0);
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;

    act(() => {
      result.current.handleDropZoneDrop(mockEvent, 1, 'after');
    });

    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
    const event = dispatchSpy.mock.calls[0][0] as Event;
    expect(event.type).toBe('task-order-updated');

    dispatchSpy.mockRestore();
  });

  it('should not save to localStorage when onOrderChange is provided', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];
    const onOrderChange = vi.fn();

    const { result } = renderHook(() => useDragAndDrop(items, onOrderChange));

    act(() => {
      result.current.handleDragStart(0);
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as DragEvent;

    act(() => {
      result.current.handleDropZoneDrop(mockEvent, 1, 'after');
    });

    expect(mockSaveTodayTaskOrder).not.toHaveBeenCalled();
    expect(onOrderChange).toHaveBeenCalled();
  });

  it('should set dragOverIndex and dropPosition based on mouse position in handleTaskDragOver', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    act(() => {
      result.current.handleDragStart(0);
    });

    const mockElement = {
      getBoundingClientRect: vi.fn(() => ({
        top: 100,
        height: 50,
      })),
    } as unknown as HTMLElement;

    const mockEvent = {
      preventDefault: vi.fn(),
      currentTarget: mockElement,
      clientY: 110, // Above middle (125)
    } as unknown as DragEvent;

    act(() => {
      result.current.handleTaskDragOver(mockEvent, 1);
    });

    expect(result.current.dragOverIndex).toBe(1);
    expect(result.current.dropPosition).toBe('before');
  });

  it('should reset drag state when handleDragLeave is called', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    act(() => {
      result.current.handleDragStart(0);
    });

    act(() => {
      result.current.handleDropZoneDragOver(
        { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as DragEvent,
        1,
        'after'
      );
    });

    expect(result.current.dragOverIndex).toBe(1);
    expect(result.current.dropPosition).toBe('after');

    act(() => {
      result.current.handleDragLeave();
    });

    expect(result.current.dragOverIndex).toBeNull();
    expect(result.current.dropPosition).toBeNull();
  });

  it('should reset drag state when handleDragEnd is called', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    act(() => {
      result.current.handleDragStart(0);
    });

    expect(result.current.draggedIndex).toBe(0);

    act(() => {
      result.current.handleDragEnd();
    });

    expect(result.current.draggedIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
    expect(result.current.dropPosition).toBeNull();
  });

  it('should update items when setItems is called', () => {
    const initialItems: TestItem[] = [{ id: '1', title: 'Item 1' }];
    const { result } = renderHook(() => useDragAndDrop(initialItems));

    const newItems: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    act(() => {
      result.current.setItems(newItems);
    });

    expect(result.current.items).toEqual(newItems);
  });

  it('should call onOrderChange when setItems is called', () => {
    const initialItems: TestItem[] = [{ id: '1', title: 'Item 1' }];
    const onOrderChange = vi.fn();
    const { result } = renderHook(() => useDragAndDrop(initialItems, onOrderChange));

    const newItems: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
    ];

    act(() => {
      result.current.setItems(newItems);
    });

    expect(onOrderChange).toHaveBeenCalledWith(newItems);
  });

  it('should reorder items, save order and dispatch event when handleDrop is called', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
      { id: '3', title: 'Item 3' },
    ];

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useDragAndDrop(items));

    // On commence à drag l'item 0 ("1")
    act(() => {
      result.current.handleDragStart(0);
    });

    // On simule un drag over sur la dropZone "après" l'index 2
    const dragOverEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDropZoneDragOver(dragOverEvent, 2, 'after');
    });

    // Puis on "drop" sur l'index 2 (avec dropPosition = 'after')
    const dropEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDrop(dropEvent, 2);
    });

    // L'ordre attendu : [2, 3, 1]
    expect(result.current.items).toEqual([
      { id: '2', title: 'Item 2' },
      { id: '3', title: 'Item 3' },
      { id: '1', title: 'Item 1' },
    ]);

    // Sauvegarde dans le localStorage (via saveTodayTaskOrder mocké)
    expect(mockSaveTodayTaskOrder).toHaveBeenCalledWith(['2', '3', '1']);

    // Event "task-order-updated" dispatché
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
    const event = dispatchSpy.mock.calls[0][0] as Event;
    expect(event.type).toBe('task-order-updated');

    dispatchSpy.mockRestore();
  });

  it('should only reset drag state and not save when handleDrop is called without a dropPosition', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
      { id: '3', title: 'Item 3' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    // On commence un drag (draggedIndex != null)
    act(() => {
      result.current.handleDragStart(1);
    });

    // On appelle handleDrop sans avoir jamais défini dropPosition
    const dropEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.DragEvent;

    act(() => {
      result.current.handleDrop(dropEvent, 1);
    });

    // L'ordre ne change pas
    expect(result.current.items).toEqual(items);

    // L'état de drag est reset
    expect(result.current.draggedIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
    expect(result.current.dropPosition).toBeNull();

    // Aucune sauvegarde ni event
    expect(mockSaveTodayTaskOrder).not.toHaveBeenCalled();
  });

  it('should correctly move the last item to the first position with handleDropZoneDrop', () => {
    const items: TestItem[] = [
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
      { id: '3', title: 'Item 3' },
      { id: '4', title: 'Item 4' },
    ];

    const { result } = renderHook(() => useDragAndDrop(items));

    // On drag le dernier élément (index 3 -> "4")
    act(() => {
      result.current.handleDragStart(3);
    });

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.DragEvent;

    // On drop "avant" l'index 0
    act(() => {
      result.current.handleDropZoneDrop(mockEvent, 0, 'before');
    });

    // L'ordre attendu : [4, 1, 2, 3]
    expect(result.current.items).toEqual([
      { id: '4', title: 'Item 4' },
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
      { id: '3', title: 'Item 3' },
    ]);

    // Et on sauvegarde bien cet ordre
    expect(mockSaveTodayTaskOrder).toHaveBeenCalledWith(['4', '1', '2', '3']);
  });
});
