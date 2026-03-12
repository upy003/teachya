import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../lib/audio/AudioEngine';

/**
 * useAudio provides access to the singleton AudioEngine
 * and handles the Tone.js initialization (requires user gesture).
 */
export function useAudio() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Initialize the audio engine on first user interaction */
  const initialize = useCallback(async () => {
    if (audioEngine.ready || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await audioEngine.init();
      setIsReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Audio init failed';
      setError(msg);
      console.error('Audio engine error:', msg);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Auto-check if already ready (e.g. after first init)
  useEffect(() => {
    if (audioEngine.ready) setIsReady(true);
  }, []);

  return { isReady, isLoading, error, initialize, audioEngine };
}
