import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { __clearHolidaysCacheForTests, getDefaultWorkMode } from '../workday-defaults';
import { formatDateLocal } from '../utils';

// Mock fetch globally
global.fetch = vi.fn();

describe('workday-defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDefaultWorkMode', () => {
    beforeEach(() => {
      __clearHolidaysCacheForTests();
    });

    it('should return Congé for Saturday', async () => {
      const saturday = new Date(2024, 5, 15); // June 15, 2024 is a Saturday
      const result = await getDefaultWorkMode(saturday);

      expect(result).toBe('Congé');
    });

    it('should return Congé for Sunday', async () => {
      const sunday = new Date(2024, 5, 16); // June 16, 2024 is a Sunday
      const result = await getDefaultWorkMode(sunday);

      expect(result).toBe('Congé');
    });

    it('should return Présentiel for Monday', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const monday = new Date(2024, 5, 10); // June 10, 2024 is a Monday
      const result = await getDefaultWorkMode(monday);

      expect(result).toBe('Présentiel');
    });

    it('should return Présentiel for Tuesday', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const tuesday = new Date(2024, 5, 11); // June 11, 2024 is a Tuesday
      const result = await getDefaultWorkMode(tuesday);

      expect(result).toBe('Présentiel');
    });

    it('should return Distanciel for Wednesday', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const wednesday = new Date(2024, 5, 12); // June 12, 2024 is a Wednesday
      const result = await getDefaultWorkMode(wednesday);

      expect(result).toBe('Distanciel');
    });

    it('should return Présentiel for Thursday', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const thursday = new Date(2024, 5, 13); // June 13, 2024 is a Thursday
      const result = await getDefaultWorkMode(thursday);

      expect(result).toBe('Présentiel');
    });

    it('should return Distanciel for Friday', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const friday = new Date(2024, 5, 14); // June 14, 2024 is a Friday
      const result = await getDefaultWorkMode(friday);

      expect(result).toBe('Distanciel');
    });

    it('should return Congé for French public holidays', async () => {
      const holidayDate = new Date(2024, 0, 1); // January 1, 2024 (New Year's Day)
      const dateStr = formatDateLocal(holidayDate);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          [dateStr]: "Jour de l'an",
        }),
      } as Response);

      const result = await getDefaultWorkMode(holidayDate);

      expect(result).toBe('Congé');
    });

    it('should fallback to weekday logic if holiday check fails', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const monday = new Date(2024, 5, 10);
      const result = await getDefaultWorkMode(monday);

      // Should still return Présentiel based on weekday
      expect(result).toBe('Présentiel');
    });

    it('should fallback to weekday logic if holiday API returns error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const monday = new Date(2024, 5, 10);
      const result = await getDefaultWorkMode(monday);

      expect(result).toBe('Présentiel');
    });

    it('should accept date string input', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await getDefaultWorkMode('2024-06-10');

      expect(result).toBe('Présentiel');
    });

    it('should handle date string for holidays', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          '2024-01-01': "Jour de l'an",
        }),
      } as Response);

      const result = await getDefaultWorkMode('2024-01-01');

      expect(result).toBe('Congé');
    });

    it('should prioritize holidays over weekday logic', async () => {
      // A Monday that is also a holiday
      const holidayMonday = new Date(2024, 4, 1); // May 1, 2024 (Labor Day, a Wednesday in 2024)
      const dateStr = formatDateLocal(holidayMonday);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          [dateStr]: 'Fête du Travail',
        }),
      } as Response);

      const result = await getDefaultWorkMode(holidayMonday);

      expect(result).toBe('Congé');
    });
  });
});