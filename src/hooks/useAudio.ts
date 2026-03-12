import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../lib/audio/AudioEngine';

/**
 * useAudio gives components access to the singleton AudioEngine
 * and handles the async Tone.js initialization.
 */
export function useAudio() {
  const [isReady, setIsReady] = useState(audioEngine.ready);
  const [isLoading, setIsLoading] = useState(audioEngine.loading);
  const [error, setError] = useState<string | null>(null);

  // Poll for ready state (handles the case where audio was init'd elsewhere)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsReady(audioEngine.ready);
      setIsLoading(audioEngine.loading);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const initialize = useCallback(async () => {
    if (audioEngine.ready || audioEngine.loading) return;
    setIsLoading(true);
    setError(null);
    try {
      await audioEngine.init();
      setIsReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Audio initialization failed';
      setError(msg);
      console.error('Audio engine error:', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isReady, isLoading, error, initialize, audioEngine };
}
