import { describe, it, expect } from 'vitest';
import { sortByDisplayOrder } from '../sort-by-display-order';

describe('sortByDisplayOrder', () => {
  it('should sort tasks by display_order ascending', () => {
    const tasks = [
      { id: '1', display_order: 3 },
      { id: '2', display_order: 1 },
      { id: '3', display_order: 2 },
    ];

    const sorted = sortByDisplayOrder(tasks);

    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });

  it('should place tasks without display_order at the end', () => {
    const tasks = [
      { id: '1', display_order: 2 },
      { id: '2' }, // no display_order
      { id: '3', display_order: 1 },
      { id: '4' }, // no display_order
    ];

    const sorted = sortByDisplayOrder(tasks);

    expect(sorted[0].id).toBe('3');
    expect(sorted[1].id).toBe('1');
    // Tasks without display_order should be at the end
    expect(sorted[2].id).toBe('2');
    expect(sorted[3].id).toBe('4');
  });

  it('should handle tasks with undefined display_order', () => {
    const tasks = [
      { id: '1', display_order: undefined },
      { id: '2', display_order: 1 },
      { id: '3', display_order: undefined },
    ];

    const sorted = sortByDisplayOrder(tasks);

    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('1');
    expect(sorted[2].id).toBe('3');
  });

  it('should handle all tasks without display_order', () => {
    const tasks: Array<{ id: string; display_order?: number }> = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ];

    const sorted = sortByDisplayOrder(tasks);

    // Order should remain the same (stable sort)
    expect(sorted).toHaveLength(3);
    expect(sorted.map(t => t.id)).toEqual(['1', '2', '3']);
  });

  it('should handle all tasks with display_order', () => {
    const tasks = [
      { id: '1', display_order: 5 },
      { id: '2', display_order: 1 },
      { id: '3', display_order: 3 },
    ];

    const sorted = sortByDisplayOrder(tasks);

    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });

  it('should handle duplicate display_order values', () => {
    const tasks = [
      { id: '1', display_order: 2 },
      { id: '2', display_order: 2 },
      { id: '3', display_order: 1 },
    ];

    const sorted = sortByDisplayOrder(tasks);

    expect(sorted[0].id).toBe('3');
    // Both tasks with display_order 2 should be after task with 1
    expect(sorted[1].display_order).toBe(2);
    expect(sorted[2].display_order).toBe(2);
  });

  it('should handle negative display_order values', () => {
    const tasks = [
      { id: '1', display_order: 0 },
      { id: '2', display_order: -1 },
      { id: '3', display_order: 1 },
    ];

    const sorted = sortByDisplayOrder(tasks);

    expect(sorted[0].id).toBe('2'); // -1
    expect(sorted[1].id).toBe('1'); // 0
    expect(sorted[2].id).toBe('3'); // 1
  });

  it('should handle empty array', () => {
    const tasks: Array<{ id: string; display_order?: number }> = [];
    const sorted = sortByDisplayOrder(tasks);

    expect(sorted).toEqual([]);
  });

  it('should not mutate original array', () => {
    const tasks = [
      { id: '1', display_order: 3 },
      { id: '2', display_order: 1 },
    ];

    const originalOrder = tasks.map(t => t.id);
    sortByDisplayOrder(tasks);

    expect(tasks.map(t => t.id)).toEqual(originalOrder);
  });

  it('should handle tasks with display_order 0', () => {
    const tasks = [
      { id: '1', display_order: 0 },
      { id: '2' }, // no display_order
      { id: '3', display_order: 1 },
    ];

    const sorted = sortByDisplayOrder(tasks);

    expect(sorted[0].id).toBe('1'); // 0 comes before 1
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('2');
  });

  it('should handle very large display_order values', () => {
    const tasks = [
      { id: '1', display_order: 1000 },
      { id: '2', display_order: 1 },
      { id: '3', display_order: 500 },
    ];

    const sorted = sortByDisplayOrder(tasks);

    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });
});
