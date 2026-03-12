// Types for MIDI device management and note events

/** A connected MIDI input device */
export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
}

/** A MIDI note-on or note-off event */
export interface MIDINoteEvent {
  /** MIDI note number 0-127 */
  midi: number;
  /** Note name with octave, e.g. "C4" */
  name: string;
  /** Velocity 0-127 (0 = note off) */
  velocity: number;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Whether this is a note-on (true) or note-off (false) */
  isNoteOn: boolean;
}

/** MIDI connection status */
export type MIDIStatus =
  | 'unavailable'   // Web MIDI API not supported
  | 'denied'        // Permission denied
  | 'disconnected'  // No device connected
  | 'connected';    // Device active
