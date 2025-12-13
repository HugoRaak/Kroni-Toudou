import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { LicenseProcessor } from '../license-processor';

const mockProcessPendingLicenseAction = vi.fn();

vi.mock('@/app/actions/auth/licenses', () => ({
  processPendingLicenseAction: (...args: unknown[]) => mockProcessPendingLicenseAction(...args),
}));

describe('LicenseProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessPendingLicenseAction.mockResolvedValue({ success: true });
  
    (globalThis as any).requestIdleCallback = (cb: any) => {
      cb();
      return 1;
    };
    (globalThis as any).cancelIdleCallback = vi.fn();
  });
  

  it('should return null (render nothing)', () => {
    const { container } = render(<LicenseProcessor />);

    expect(container.firstChild).toBeNull();
  });

  it('should call processPendingLicenseAction once on mount', async () => {
    render(<LicenseProcessor />);

    // Wait for useEffect to execute
    await waitFor(() => {
      expect(mockProcessPendingLicenseAction).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call processPendingLicenseAction multiple times on re-render', async () => {
    const { rerender } = render(<LicenseProcessor />);

    await waitFor(() => {
      expect(mockProcessPendingLicenseAction).toHaveBeenCalledTimes(1);
    });

    rerender(<LicenseProcessor />);

    await waitFor(() => {
      expect(mockProcessPendingLicenseAction).toHaveBeenCalledTimes(1);
    });
  });

  it('should log error if processPendingLicenseAction rejects', async () => {
    const error = new Error('Processing failed');
    mockProcessPendingLicenseAction.mockRejectedValue(error);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<LicenseProcessor />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing pending license:', error);
    });

    expect(mockProcessPendingLicenseAction).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });

  it('should not crash if processPendingLicenseAction rejects', async () => {
    const error = new Error('Processing failed');
    mockProcessPendingLicenseAction.mockRejectedValue(error);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw
    expect(() => {
      render(<LicenseProcessor />);
    }).not.toThrow();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});
