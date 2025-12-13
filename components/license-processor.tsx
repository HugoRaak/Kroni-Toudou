'use client';

import { useEffect, useRef } from 'react';
import { processPendingLicenseAction } from '@/app/actions/auth/licenses';

export function LicenseProcessor() {
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Defer license processing to idle time to avoid competing with critical requests
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const processLicense = () => {
      processPendingLicenseAction().catch((error) => {
        console.error('Error processing pending license:', error);
      });
    };

    // Use requestIdleCallback with fallback to setTimeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleCallbackId = requestIdleCallback(
        processLicense,
        { timeout: 2000 }, // Fallback after 2 seconds if idle never comes
      );
      return () => {
        cancelIdleCallback(idleCallbackId);
      };
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeoutId = setTimeout(processLicense, 1500);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, []);

  // This component doesn't render anything
  return null;
}
