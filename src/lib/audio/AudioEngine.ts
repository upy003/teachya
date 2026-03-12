import * as Tone from 'tone';

/**
 * AudioEngine wraps Tone.js to provide realistic piano sounds.
 * Uses a Tone.Sampler with soundfont samples (acoustic grand piano).
 *
 * Initialization is deferred because browsers require a user gesture
 * before an AudioContext can start. Call init() inside a click handler.
 */

// Public soundfont hosted via GitHub (MusyngKite acoustic grand piano)
const SOUNDFONT_BASE =
  'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-mp3/';

/** Note names that have pre-recorded samples */
const SAMPLE_NOTES: Record<string, string> = {
  'A0': 'A0.mp3', 'C1': 'C1.mp3', 'Ds1': 'Ds1.mp3', 'Fs1': 'Fs1.mp3',
  'A1': 'A1.mp3', 'C2': 'C2.mp3', 'Ds2': 'Ds2.mp3', 'Fs2': 'Fs2.mp3',
  'A2': 'A2.mp3', 'C3': 'C3.mp3', 'Ds3': 'Ds3.mp3', 'Fs3': 'Fs3.mp3',
  'A3': 'A3.mp3', 'C4': 'C4.mp3', 'Ds4': 'Ds4.mp3', 'Fs4': 'Fs4.mp3',
  'A4': 'A4.mp3', 'C5': 'C5.mp3', 'Ds5': 'Ds5.mp3', 'Fs5': 'Fs5.mp3',
  'A5': 'A5.mp3', 'C6': 'C6.mp3', 'Ds6': 'Ds6.mp3', 'Fs6': 'Fs6.mp3',
  'A6': 'A6.mp3', 'C7': 'C7.mp3', 'Ds7': 'Ds7.mp3', 'Fs7': 'Fs7.mp3',
  'A7': 'A7.mp3', 'C8': 'C8.mp3',
};

/** Convert "Ds4" → "D#4" for Tone.js note naming */
function convertNoteKey(key: string): string {
  return key.replace('s', '#');
}

class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private _isReady = false;
  private _isLoading = false;
  private volumeDb = -6;

  /**
   * Initialize the Tone.js sampler.
   * Must be called inside a user-gesture handler (click/keydown).
   * Safe to call multiple times — will return immediately if already initialized.
   */
  async init(): Promise<void> {
    if (this._isReady || this._isLoading) return;
    this._isLoading = true;

    try {
      // Resume AudioContext (required by browsers)
      await Tone.start();

      const urls: Record<string, string> = {};
      Object.entries(SAMPLE_NOTES).forEach(([key, file]) => {
        urls[convertNoteKey(key)] = file;
      });

      await new Promise<void>((resolve, reject) => {
        this.sampler = new Tone.Sampler({
          urls,
          baseUrl: SOUNDFONT_BASE,
          release: 1.2,
          onload: () => {
            this._isReady = true;
            this._isLoading = false;
            resolve();
          },
          onerror: (err) => {
            this._isLoading = false;
            reject(err);
          },
        }).toDestination();

        this.sampler.volume.value = this.volumeDb;
      });
    } catch (err) {
      this._isLoading = false;
      throw err;
    }
  }

  /**
   * Play a note by MIDI number.
   * @param midi - MIDI note 0-127
   * @param velocity - velocity 0-127 (default 80)
   * @param durationSec - duration in seconds (default 0.5s)
   */
  playNote(midi: number, velocity = 80, durationSec = 0.5): void {
    if (!this.sampler || !this._isReady) return;
    try {
      const noteName = Tone.Frequency(midi, 'midi').toNote();
      const gain = Math.max(0.01, Math.min(1, velocity / 127));
      // Pass duration as seconds string (e.g. "0.5") — always valid in Tone.js
      this.sampler.triggerAttackRelease(
        noteName,
        durationSec,
        Tone.now(),
        gain,
      );
    } catch {
      // Silently ignore if sampler isn't loaded yet
    }
  }

  /** Trigger a note sustain (note-on without scheduled release). */
  attackNote(midi: number, velocity = 80): void {
    if (!this.sampler || !this._isReady) return;
    try {
      const noteName = Tone.Frequency(midi, 'midi').toNote();
      this.sampler.triggerAttack(noteName, Tone.now(), velocity / 127);
    } catch { /* ignore */ }
  }

  /** Release a sustained note (note-off). */
  releaseNote(midi: number): void {
    if (!this.sampler || !this._isReady) return;
    try {
      const noteName = Tone.Frequency(midi, 'midi').toNote();
      this.sampler.triggerRelease(noteName, Tone.now());
    } catch { /* ignore */ }
  }

  /** Set master volume in dB (−60 to 0). */
  setVolume(db: number): void {
    this.volumeDb = db;
    if (this.sampler) this.sampler.volume.value = db;
  }

  get ready(): boolean { return this._isReady; }
  get loading(): boolean { return this._isLoading; }
}

/** Singleton audio engine shared across the entire app */
export const audioEngine = new AudioEngine();
