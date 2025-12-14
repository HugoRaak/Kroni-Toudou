import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTaskCategory,
  getCategoryFilter,
  getCategoryFromFormData,
  calculateNextDisplayOrder,
  hasCategoryChanged,
} from '../task-metadata';
import { supabaseServer } from '@/lib/supabase/supabase-server';

// Mock supabase-server
vi.mock('@/lib/supabase/supabase-server', () => ({
  supabaseServer: vi.fn(),
}));

describe('task-metadata', () => {
  describe('getTaskCategory', () => {
    it('should return periodic for tasks with frequency', () => {
      expect(getTaskCategory('hebdomadaire', null)).toBe('periodic');
      expect(getTaskCategory('mensuel', '2024-06-15')).toBe('periodic');
    });

    it('should return specific for tasks with due_on but no frequency', () => {
      expect(getTaskCategory(null, '2024-06-15')).toBe('specific');
      expect(getTaskCategory(undefined, '2024-06-15')).toBe('specific');
    });

    it('should return when-possible for tasks with neither frequency nor due_on', () => {
      expect(getTaskCategory(null, null)).toBe('when-possible');
      expect(getTaskCategory(undefined, undefined)).toBe('when-possible');
    });
  });

  describe('getCategoryFilter', () => {
    it('should filter periodic tasks', () => {
      const filter = getCategoryFilter('periodic');

      expect(filter({ frequency: 'hebdomadaire' })).toBe(true);
      expect(filter({ frequency: 'mensuel', due_on: '2024-06-15' })).toBe(true);
      expect(filter({ frequency: null })).toBe(false);
      expect(filter({ due_on: '2024-06-15' })).toBe(false);
    });

    it('should filter specific tasks', () => {
      const filter = getCategoryFilter('specific');

      expect(filter({ due_on: '2024-06-15' })).toBe(true);
      expect(filter({ due_on: '2024-06-15', frequency: null })).toBe(true);
      expect(filter({ frequency: 'hebdomadaire', due_on: '2024-06-15' })).toBe(false);
      expect(filter({ frequency: null, due_on: null })).toBe(false);
    });

    it('should filter when-possible tasks', () => {
      const filter = getCategoryFilter('when-possible');

      expect(filter({ frequency: null, due_on: null })).toBe(true);
      expect(filter({})).toBe(true);
      expect(filter({ frequency: 'hebdomadaire' })).toBe(false);
      expect(filter({ due_on: '2024-06-15' })).toBe(false);
    });
  });

  describe('getCategoryFromFormData', () => {
    it('should return category from form data', () => {
      expect(getCategoryFromFormData('hebdomadaire', undefined)).toBe('periodic');
      expect(getCategoryFromFormData(undefined, '2024-06-15')).toBe('specific');
      expect(getCategoryFromFormData(undefined, undefined)).toBe('when-possible');
    });
  });

  describe('calculateNextDisplayOrder', () => {
    const mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: vi.fn((resolve: any) => {
              resolve({ data: [], error: null });
            }),
          })),
        })),
      })),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(supabaseServer).mockResolvedValue(mockSupabaseClient as any);
    });

    it('should return 1 when no tasks exist', async () => {
      const result = await calculateNextDisplayOrder(
        mockSupabaseClient as any,
        'user1',
        'periodic',
      );

      expect(result).toBe(1);
    });

    it('should return max display_order + 1 for periodic tasks', async () => {
      const mockTasks = [
        { id: '1', display_order: 3, frequency: 'hebdomadaire', due_on: null },
        { id: '2', display_order: 5, frequency: 'mensuel', due_on: null },
        { id: '3', display_order: 1, frequency: null, due_on: '2024-06-15' },
      ];

      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        }),
      } as any;

      const result = await calculateNextDisplayOrder(
        mockSupabaseClient as any,
        'user1',
        'periodic',
      );

      expect(result).toBe(6); // max(3, 5) + 1
    });

    it('should return max display_order + 1 for specific tasks', async () => {
      const mockTasks = [
        { id: '1', display_order: 2, frequency: null, due_on: '2024-06-15' },
        { id: '2', display_order: 4, frequency: null, due_on: '2024-06-20' },
        { id: '3', display_order: 1, frequency: 'hebdomadaire', due_on: null },
      ];

      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        }),
      } as any;

      const result = await calculateNextDisplayOrder(
        mockSupabaseClient as any,
        'user1',
        'specific',
      );

      expect(result).toBe(5); // max(2, 4) + 1
    });

    it('should exclude task ID when provided', async () => {
      const mockTasks = [
        { id: '1', display_order: 5, frequency: 'hebdomadaire', due_on: null },
        { id: '2', display_order: 3, frequency: 'mensuel', due_on: null },
      ];

      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        }),
      } as any;

      const result = await calculateNextDisplayOrder(
        mockSupabaseClient as any,
        'user1',
        'periodic',
        '1', // Exclude task with display_order 5
      );

      expect(result).toBe(4); // max(3) + 1, excluding task 1
    });

    it('should handle tasks without display_order', async () => {
      const mockTasks = [
        { id: '1', display_order: null, frequency: 'hebdomadaire', due_on: null },
        { id: '2', display_order: 3, frequency: 'mensuel', due_on: null },
        { id: '3', display_order: undefined, frequency: 'hebdomadaire', due_on: null },
      ];

      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        }),
      } as any;

      const result = await calculateNextDisplayOrder(
        mockSupabaseClient as any,
        'user1',
        'periodic',
      );

      expect(result).toBe(4); // max(3) + 1, ignoring null/undefined
    });

    it('should handle null data from Supabase', async () => {
      const mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any;

      const result = await calculateNextDisplayOrder(
        mockSupabaseClient as any,
        'user1',
        'when-possible',
      );

      expect(result).toBe(1);
    });
  });

  describe('hasCategoryChanged', () => {
    it('should return false when category has not changed', () => {
      expect(hasCategoryChanged('hebdomadaire', null, 'hebdomadaire', null)).toBe(false);
      expect(hasCategoryChanged(null, '2024-06-15', null, '2024-06-15')).toBe(false);
      expect(hasCategoryChanged(null, null, null, null)).toBe(false);
    });

    it('should return true when category changes from periodic to specific', () => {
      expect(hasCategoryChanged('hebdomadaire', null, null, '2024-06-15')).toBe(true);
    });

    it('should return true when category changes from specific to periodic', () => {
      expect(hasCategoryChanged(null, '2024-06-15', 'hebdomadaire', null)).toBe(true);
    });

    it('should return true when category changes from periodic to when-possible', () => {
      expect(hasCategoryChanged('hebdomadaire', null, null, null)).toBe(true);
    });

    it('should return true when category changes from specific to when-possible', () => {
      expect(hasCategoryChanged(null, '2024-06-15', null, null)).toBe(true);
    });

    it('should return true when category changes from when-possible to periodic', () => {
      expect(hasCategoryChanged(null, null, 'hebdomadaire', null)).toBe(true);
    });

    it('should return true when category changes from when-possible to specific', () => {
      expect(hasCategoryChanged(null, null, null, '2024-06-15')).toBe(true);
    });

    it('should handle undefined values', () => {
      expect(hasCategoryChanged(undefined, undefined, 'hebdomadaire', null)).toBe(true);
      expect(hasCategoryChanged('hebdomadaire', null, undefined, undefined)).toBe(true);
    });
  });
});
