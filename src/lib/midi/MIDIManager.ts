import { WebMidi } from 'webmidi';
import { useMIDIStore } from '../../stores/midiStore';
import type { MIDIDevice, MIDINoteEvent } from '../../types/MIDI';
import { audioEngine } from '../audio/AudioEngine';

/** Singleton manager for MIDI initialization and device switching */
class MIDIManager {
  private initialized = false;

  /** Attach note-on/off listeners to a specific input device */
  private attachListeners(inputId: string) {
    if (!WebMidi.enabled) return;

    const input = WebMidi.inputs.find((i) => i.id === inputId);
    if (!input) return;

    const { noteOn, noteOff } = useMIDIStore.getState();

    input.addListener('noteon', (e) => {
      const event: MIDINoteEvent = {
        midi: e.note.number,
        name: e.note.identifier,
        velocity: Math.round((e.note.attack ?? 0.63) * 127),
        timestamp: e.timestamp,
        isNoteOn: true,
      };
      noteOn(event);
      // Play through audio engine for real-time sound feedback
      if (audioEngine.ready) {
        audioEngine.attackNote(event.midi, event.velocity);
      }
    });

    input.addListener('noteoff', (e) => {
      noteOff(e.note.number);
      if (audioEngine.ready) {
        audioEngine.releaseNote(e.note.number);
      }
    });
  }

  /** Initialize WebMidi.js and start device detection */
  async init(): Promise<void> {
    if (this.initialized) return;

    const { setStatus, setDevices, setActiveDevice } = useMIDIStore.getState();

    try {
      await WebMidi.enable({ sysex: false });
      this.initialized = true;

      const updateDevices = () => {
        const devices: MIDIDevice[] = WebMidi.inputs.map((input) => ({
          id: input.id,
          name: input.name,
          manufacturer: input.manufacturer ?? '',
          state: 'connected',
        }));
        setDevices(devices);

        if (WebMidi.inputs.length > 0) {
          const activeId = useMIDIStore.getState().activeDeviceId;
          // Only auto-assign if none is selected yet
          if (!activeId) {
            const firstId = WebMidi.inputs[0]!.id;
            setActiveDevice(firstId);
            this.attachListeners(firstId);
          }
          setStatus('connected');
        } else {
          setStatus('disconnected');
        }
      };

      updateDevices();

      // Hot-plug detection
      WebMidi.addListener('connected', updateDevices);
      WebMidi.addListener('disconnected', updateDevices);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('permission')) {
        useMIDIStore.getState().setStatus('denied');
      } else {
        useMIDIStore.getState().setStatus('unavailable');
      }
      console.warn('WebMidi not available:', msg);
    }
  }

  /** Switch the active MIDI input device */
  selectDevice(deviceId: string): void {
    if (!WebMidi.enabled) return;

    // Remove listeners from all inputs first
    WebMidi.inputs.forEach((input) => input.removeListener());

    const { setActiveDevice, setStatus } = useMIDIStore.getState();
    const input = WebMidi.inputs.find((i) => i.id === deviceId);

    if (input) {
      this.attachListeners(deviceId);
      setActiveDevice(deviceId);
      setStatus('connected');
    }
  }
}

export const midiManager = new MIDIManager();
