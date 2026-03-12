import { useEffect, useCallback } from 'react';
import { WebMidi, type Input, type NoteMessageEvent } from 'webmidi';
import { useMIDIStore } from '../stores/midiStore';
import type { MIDIDevice, MIDINoteEvent } from '../types/MIDI';
import { audioEngine } from '../lib/audio/AudioEngine';

/**
 * useMIDI initializes WebMidi.js and wires MIDI device events to the store.
 * Must be called once at the app root level.
 */
export function useMIDI() {
  const { setStatus, setDevices, activeDeviceId, setActiveDevice, noteOn, noteOff } =
    useMIDIStore();

  /** Convert WebMidi Input to our MIDIDevice type */
  const toDevice = (input: Input): MIDIDevice => ({
    id: input.id,
    name: input.name,
    manufacturer: input.manufacturer ?? '',
    state: 'connected',
  });

  /** Attach note listeners to a specific input */
  const attachListeners = useCallback(
    (input: Input) => {
      // Listen for note-on events
      input.addListener('noteon', (e: NoteMessageEvent) => {
        const event: MIDINoteEvent = {
          midi: e.note.number,
          name: e.note.identifier,
          velocity: Math.round((e.note.attack ?? 0.5) * 127),
          timestamp: e.timestamp,
          isNoteOn: true,
        };
        noteOn(event);
        // Play through the audio engine for real-time sound
        audioEngine.attackNote(event.midi, event.velocity);
      });

      // Listen for note-off events
      input.addListener('noteoff', (e: NoteMessageEvent) => {
        noteOff(e.note.number);
        audioEngine.releaseNote(e.note.number);
      });
    },
    [noteOn, noteOff],
  );

  useEffect(() => {
    let mounted = true;

    WebMidi.enable({ sysex: false })
      .then(() => {
        if (!mounted) return;
        setStatus('connected');

        const updateDevices = () => {
          const devices = WebMidi.inputs.map(toDevice);
          setDevices(devices);

          // Auto-select first device if none selected
          if (WebMidi.inputs.length > 0) {
            const firstId = WebMidi.inputs[0].id;
            setActiveDevice(firstId);
            attachListeners(WebMidi.inputs[0]);
          } else {
            setStatus('disconnected');
          }
        };

        updateDevices();

        // Hot-plug: listen for device connect/disconnect
        WebMidi.addListener('connected', updateDevices);
        WebMidi.addListener('disconnected', updateDevices);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        if (err.message?.toLowerCase().includes('permission')) {
          setStatus('denied');
        } else {
          setStatus('unavailable');
        }
        console.warn('WebMidi not available:', err.message);
      });

    return () => {
      mounted = false;
      if (WebMidi.enabled) {
        WebMidi.disable();
      }
    };
  }, []); // Only run once on mount

  /** Switch to a different MIDI input device */
  const selectDevice = useCallback(
    (deviceId: string) => {
      if (!WebMidi.enabled) return;
      // Remove listeners from all inputs
      WebMidi.inputs.forEach((input) => input.removeListener());
      // Attach to selected
      const input = WebMidi.inputs.find((i) => i.id === deviceId);
      if (input) {
        attachListeners(input);
        setActiveDevice(deviceId);
        setStatus('connected');
      }
    },
    [attachListeners, setActiveDevice, setStatus],
  );

  return { selectDevice, activeDeviceId };
}
