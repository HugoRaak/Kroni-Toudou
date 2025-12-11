import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processPendingLicenseAction } from '../licenses';

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
};

const mockSupabaseServer = vi.fn(() => Promise.resolve(mockSupabaseClient));

const mockAssociateLicenseToUser = vi.fn();

vi.mock('@/lib/supabase/supabase-server', () => ({
  supabaseServer: () => mockSupabaseServer(),
}));

vi.mock('@/lib/db/licenses', () => ({
  associateLicenseToUser: (...args: unknown[]) => mockAssociateLicenseToUser(...args),
}));

describe('processPendingLicenseAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process pending license successfully', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        pending_license_key: 'LICENSE-123',
      },
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockAssociateLicenseToUser.mockResolvedValue({ success: true });

    mockSupabaseClient.auth.updateUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const result = await processPendingLicenseAction();

    expect(result).toEqual({ success: true });
    expect(mockAssociateLicenseToUser).toHaveBeenCalledWith('LICENSE-123', 'user-123');
    expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
      data: {
        pending_license_key: null,
      },
    });
  });

  it('should return success if no pending license', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z',
      user_metadata: {},
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const result = await processPendingLicenseAction();

    expect(result).toEqual({ success: true });
    expect(mockAssociateLicenseToUser).not.toHaveBeenCalled();
    expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it('should return error if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await processPendingLicenseAction();

    expect(result).toEqual({
      success: false,
      error: 'Utilisateur non authentifié',
    });
    expect(mockAssociateLicenseToUser).not.toHaveBeenCalled();
  });

  it('should return error if getUser returns an error', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth error' },
    });

    const result = await processPendingLicenseAction();

    expect(result).toEqual({
      success: false,
      error: 'Utilisateur non authentifié',
    });
    expect(mockAssociateLicenseToUser).not.toHaveBeenCalled();
  });

  it('should return error if email is not confirmed', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      email_confirmed_at: null,
      user_metadata: {
        pending_license_key: 'LICENSE-123',
      },
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const result = await processPendingLicenseAction();

    expect(result).toEqual({
      success: false,
      error: 'Email non confirmé',
    });
    expect(mockAssociateLicenseToUser).not.toHaveBeenCalled();
  });

  it('should return error if associateLicenseToUser fails', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        pending_license_key: 'LICENSE-123',
      },
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockAssociateLicenseToUser.mockResolvedValue({
      success: false,
      error: 'Licence introuvable',
    });

    const result = await processPendingLicenseAction();

    expect(result).toEqual({
      success: false,
      error: 'Licence introuvable',
    });
    expect(mockAssociateLicenseToUser).toHaveBeenCalledWith('LICENSE-123', 'user-123');
    expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled();
  });

  it('should return success even if updateUser fails to remove pending_license_key', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        pending_license_key: 'LICENSE-123',
      },
    };

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockAssociateLicenseToUser.mockResolvedValue({ success: true });

    mockSupabaseClient.auth.updateUser.mockResolvedValue({
      data: { user: mockUser },
      error: { message: 'Update failed' },
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await processPendingLicenseAction();

    expect(result).toEqual({ success: true });
    expect(mockAssociateLicenseToUser).toHaveBeenCalledWith('LICENSE-123', 'user-123');
    expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
      data: {
        pending_license_key: null,
      },
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error removing pending license from metadata:',
      { message: 'Update failed' },
    );

    consoleErrorSpy.mockRestore();
  });
});
