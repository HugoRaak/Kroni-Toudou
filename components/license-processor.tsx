"use client";

import { useEffect } from 'react';
import { processPendingLicenseAction } from '@/app/actions/licenses';

export function LicenseProcessor() {
  useEffect(() => {
    // Process pending license when component mounts
    // This runs on the client side after the page loads
    processPendingLicenseAction().catch((error) => {
      console.error('Error processing pending license:', error);
    });
  }, []);

  // This component doesn't render anything
  return null;
}

