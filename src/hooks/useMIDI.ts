import { useEffect } from 'react';
import { midiManager } from '../lib/midi/MIDIManager';

/**
 * useMIDI initializes the MIDIManager singleton.
 * Call this ONCE at the app root level (App.tsx).
 * Components that need MIDI state should use useMIDIStore() directly.
 */
export function useMIDI() {
  useEffect(() => {
    // Initialize MIDI on mount (safe to call multiple times — idempotent)
    midiManager.init().catch(console.warn);
  }, []);
}
