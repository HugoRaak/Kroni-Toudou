import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateLicense, associateLicenseToUser } from '../licenses';

const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
};

const mockQueryBuilder = (args: any) => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(() => Promise.resolve(args)),
    })),
  })),
});

const mockSupabaseServer = vi.fn(() => Promise.resolve(mockSupabaseClient));

vi.mock('@/lib/supabase/supabase-server', () => ({
  supabaseServer: () => mockSupabaseServer(),
}));

describe('licenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateLicense', () => {
    it('should return { valid: true } for a valid license', async () => {
      const mockQueryBuilderResult = mockQueryBuilder({
        data: {
          key: 'LICENSE-123',
          user_id: null,
          active: true,
          expires_at: null,
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilderResult);

      const result = await validateLicense('LICENSE-123');

      expect(result).toEqual({ valid: true });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('licences');
    });

    it('should return error if Supabase query fails', async () => {
      const mockQueryBuilderResult = mockQueryBuilder({
        data: null,
        error: { message: 'Database error' },
      });

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilderResult);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await validateLicense('LICENSE-123');

      expect(result).toEqual({
        valid: false,
        error: 'Erreur lors de la vérification de la licence',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error validating license:', {
        message: 'Database error',
      });

      consoleErrorSpy.mockRestore();
    });

    it('should return error if license not found', async () => {
      const mockQueryBuilderResult = mockQueryBuilder({
        data: null,
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilderResult);

      const result = await validateLicense('LICENSE-123');

      expect(result).toEqual({
        valid: false,
        error: 'Licence introuvable',
      });
    });

    it('should return error if license is already used', async () => {
      const mockQueryBuilderResult = mockQueryBuilder({
        data: {
          key: 'LICENSE-123',
          user_id: 'user-123',
          active: true,
          expires_at: null,
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilderResult);

      const result = await validateLicense('LICENSE-123');

      expect(result).toEqual({
        valid: false,
        error: 'Cette licence est déjà utilisée',
      });
    });

    it('should return error if license is disabled', async () => {
      const mockQueryBuilderResult = mockQueryBuilder({
        data: {
          key: 'LICENSE-123',
          user_id: null,
          active: false,
          expires_at: null,
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilderResult);

      const result = await validateLicense('LICENSE-123');

      expect(result).toEqual({
        valid: false,
        error: 'Cette licence est désactivée',
      });
    });

    it('should return error if license has expired', async () => {
      vi.useFakeTimers();
      const pastDate = new Date('2024-01-01T00:00:00Z');
      const futureDate = new Date('2024-12-31T23:59:59Z');

      // Set system time to a date after expiration
      vi.setSystemTime(futureDate);

      const mockQueryBuilderResult = mockQueryBuilder({
        data: {
          key: 'LICENSE-123',
          user_id: null,
          active: true,
          expires_at: pastDate.toISOString(),
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilderResult);

      const result = await validateLicense('LICENSE-123');

      expect(result).toEqual({
        valid: false,
        error: 'Cette licence a expiré',
      });
    });

    it('should accept license with expires_at null (no expiration)', async () => {
      const mockQueryBuilderResult = mockQueryBuilder({
        data: {
          key: 'LICENSE-123',
          user_id: null,
          active: true,
          expires_at: null,
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilderResult);

      const result = await validateLicense('LICENSE-123');

      expect(result).toEqual({ valid: true });
    });

    it('should accept license with active null (active by default)', async () => {
      const mockQueryBuilderResult = mockQueryBuilder({
        data: {
          key: 'LICENSE-123',
          user_id: null,
          active: null,
          expires_at: null,
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilderResult);

      const result = await validateLicense('LICENSE-123');

      expect(result).toEqual({ valid: true });
    });

    it('should accept license with both expires_at null and active null', async () => {
      const mockQueryBuilderResult = mockQueryBuilder({
        data: {
          key: 'LICENSE-123',
          user_id: null,
          active: null,
          expires_at: null,
        },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilderResult);

      const result = await validateLicense('LICENSE-123');

      expect(result).toEqual({ valid: true });
    });
  });

  describe('associateLicenseToUser', () => {
    it('should associate a valid license to a user successfully', async () => {
      // Mock query builder that supports both select (for validateLicense) and update
      const mockSelectBuilder = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                key: 'LICENSE-123',
                user_id: null,
                active: true,
                expires_at: null,
              },
              error: null,
            }),
          ),
        })),
      };

      const mockUpdateBuilder = {
        eq: vi.fn(() =>
          Promise.resolve({
            error: null,
          }),
        ),
      };

      const mockQueryBuilder = {
        select: vi.fn(() => mockSelectBuilder),
        update: vi.fn(() => mockUpdateBuilder),
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await associateLicenseToUser('LICENSE-123', 'user-123');

      expect(result).toEqual({ success: true });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('licences');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ user_id: 'user-123' });
      expect(mockUpdateBuilder.eq).toHaveBeenCalledWith('key', 'LICENSE-123');
    });

    it('should not call update if validation fails', async () => {
      const mockQueryBuilder = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  key: 'LICENSE-123',
                  user_id: 'user-456', // Already used
                  active: true,
                  expires_at: null,
                },
                error: null,
              }),
            ),
          })),
        })),
        update: vi.fn(),
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const result = await associateLicenseToUser('LICENSE-123', 'user-123');

      expect(result).toEqual({
        success: false,
        error: 'Cette licence est déjà utilisée',
      });
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('should return error if update fails', async () => {
      const mockSelectBuilder = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                key: 'LICENSE-123',
                user_id: null,
                active: true,
                expires_at: null,
              },
              error: null,
            }),
          ),
        })),
      };

      const mockUpdateBuilder = {
        eq: vi.fn(() =>
          Promise.resolve({
            error: { message: 'Update failed' },
          }),
        ),
      };

      const mockQueryBuilder = {
        select: vi.fn(() => mockSelectBuilder),
        update: vi.fn(() => mockUpdateBuilder),
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await associateLicenseToUser('LICENSE-123', 'user-123');

      expect(result).toEqual({
        success: false,
        error: "Erreur lors de l'association de la licence",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error associating license to user:', {
        message: 'Update failed',
      });

      consoleErrorSpy.mockRestore();
    });

    it('should call validateLicense before update', async () => {
      const mockSelectBuilder = {
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: {
                key: 'LICENSE-123',
                user_id: null,
                active: true,
                expires_at: null,
              },
              error: null,
            }),
          ),
        })),
      };

      const mockUpdateBuilder = {
        eq: vi.fn(() =>
          Promise.resolve({
            error: null,
          }),
        ),
      };

      const mockQueryBuilder = {
        select: vi.fn(() => mockSelectBuilder),
        update: vi.fn(() => mockUpdateBuilder),
      };

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder);

      await associateLicenseToUser('LICENSE-123', 'user-123');

      // validateLicense is called inside associateLicenseToUser, which calls select
      // We verify the order by checking that select was called before update
      const selectCallOrder = mockQueryBuilder.select.mock.invocationCallOrder[0];
      const updateCallOrder = mockQueryBuilder.update.mock.invocationCallOrder[0];

      expect(selectCallOrder).toBeLessThan(updateCallOrder);
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });
  });
});
