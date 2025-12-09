import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkModeConflict } from '../task-validation-service';
import { getWorkday } from '@/lib/db/workdays';

// Mock workdays
vi.mock('@/lib/db/workdays', () => ({
  getWorkday: vi.fn(),
}));

describe('task-validation-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkModeConflict', () => {
    it('should return null if no due_on', async () => {
      const result = await checkModeConflict('user1', undefined, 'Présentiel');

      expect(result).toBeNull();
    });

    it('should return null if mode is Tous and work mode is Présentiel', async () => {
      vi.mocked(getWorkday).mockResolvedValue('Présentiel');

      const result = await checkModeConflict('user1', '2024-06-15', 'Tous');

      expect(result).toBeNull();
    });

    it('should return null if mode is undefined (defaults to Tous)', async () => {
      vi.mocked(getWorkday).mockResolvedValue('Présentiel');

      const result = await checkModeConflict('user1', '2024-06-15', undefined);

      expect(result).toBeNull();
    });

    it('should return null if task mode matches work mode', async () => {
      vi.mocked(getWorkday).mockResolvedValue('Présentiel');

      const result = await checkModeConflict('user1', '2024-06-15', 'Présentiel');

      expect(result).toBeNull();
    });

    it('should return conflict if task mode does not match work mode', async () => {
      vi.mocked(getWorkday).mockResolvedValue('Distanciel');

      const result = await checkModeConflict('user1', '2024-06-15', 'Présentiel');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('MODE_CONFLICT');
      expect(result?.taskDate).toBe('2024-06-15');
      expect(result?.taskMode).toBe('Présentiel');
      expect(result?.workMode).toBe('Distanciel');
    });

    it('should return conflict if work mode is Congé', async () => {
      vi.mocked(getWorkday).mockResolvedValue('Congé');

      const result = await checkModeConflict('user1', '2024-06-15', 'Tous');

      expect(result).not.toBeNull();
      expect(result?.type).toBe('MODE_CONFLICT');
      expect(result?.taskDate).toBe('2024-06-15');
      expect(result?.taskMode).toBe('Tous');
      expect(result?.workMode).toBe('Congé');
    });

    it('should return conflict if work mode is Congé even with specific task mode', async () => {
      vi.mocked(getWorkday).mockResolvedValue('Congé');

      const result = await checkModeConflict('user1', '2024-06-15', 'Présentiel');

      expect(result).not.toBeNull();
      expect(result?.workMode).toBe('Congé');
    });

    it('should handle Distanciel task mode with Présentiel work mode', async () => {
      vi.mocked(getWorkday).mockResolvedValue('Présentiel');

      const result = await checkModeConflict('user1', '2024-06-15', 'Distanciel');

      expect(result).not.toBeNull();
      expect(result?.taskMode).toBe('Distanciel');
      expect(result?.workMode).toBe('Présentiel');
    });

    it('should handle Présentiel task mode with Distanciel work mode', async () => {
      vi.mocked(getWorkday).mockResolvedValue('Distanciel');

      const result = await checkModeConflict('user1', '2024-06-15', 'Présentiel');

      expect(result).not.toBeNull();
      expect(result?.taskMode).toBe('Présentiel');
      expect(result?.workMode).toBe('Distanciel');
    });
  });
});
