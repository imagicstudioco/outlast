'use client';

import { useEffect, useState } from 'react';
import { initializeFrame } from '@/lib/frame';

export function FrameInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFrame();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize frame:', err);
        setError(err.message || 'Failed to initialize frame');
      }
    };

    init();
  }, []);

  // Store initialization state in window for other components to access
  useEffect(() => {
    window.frameInitialized = isInitialized;
    window.frameError = error;
  }, [isInitialized, error]);

  return null;
}