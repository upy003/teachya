import { create } from 'zustand';
import type { MIDIDevice, MIDINoteEvent, MIDIStatus } from '../types/MIDI';

/** State for MIDI device management and real-time note input */
interface MIDIState {
  status: MIDIStatus;
  devices: MIDIDevice[];
  /** ID of the currently selected/active input device */
  activeDeviceId: string | null;
  /** Currently depressed keys (MIDI note numbers) */
  activeNotes: Set<number>;
  /** Last received note event (used by the practice engine) */
  lastNoteEvent: MIDINoteEvent | null;

  // Actions
  setStatus: (status: MIDIStatus) => void;
  setDevices: (devices: MIDIDevice[]) => void;
  setActiveDevice: (id: string | null) => void;
  noteOn: (event: MIDINoteEvent) => void;
  noteOff: (midi: number) => void;
}

export const useMIDIStore = create<MIDIState>((set) => ({
  status: 'disconnected',
  devices: [],
  activeDeviceId: null,
  activeNotes: new Set(),
  lastNoteEvent: null,

  setStatus: (status) => set({ status }),
  setDevices: (devices) => set({ devices }),
  setActiveDevice: (activeDeviceId) => set({ activeDeviceId }),

  noteOn: (event) =>
    set((state) => ({
      lastNoteEvent: event,
      // Add note to the active set (new Set to trigger React re-renders)
      activeNotes: new Set([...state.activeNotes, event.midi]),
    })),

  noteOff: (midi) =>
    set((state) => {
      const next = new Set(state.activeNotes);
      next.delete(midi);
      return { activeNotes: next };
    }),
}));
