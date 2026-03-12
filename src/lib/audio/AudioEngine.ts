import * as Tone from 'tone';

/**
 * AudioEngine wraps Tone.js to provide realistic piano sounds.
 * Uses a Tone.Sampler with Salamander Grand Piano samples (via CDN).
 */

// Salamander piano samples hosted on a public CDN
const SALAMANDER_BASE = 'https://gleitz.github.io/midi-js-soundfonts/Ploygon/acoustic_grand_piano-mp3/';

/** Note names that have pre-recorded samples */
const SAMPLE_NOTES = [
  'A0', 'C1', 'Ds1', 'Fs1', 'A1',
  'C2', 'Ds2', 'Fs2', 'A2',
  'C3', 'Ds3', 'Fs3', 'A3',
  'C4', 'Ds4', 'Fs4', 'A4',
  'C5', 'Ds5', 'Fs5', 'A5',
  'C6', 'Ds6', 'Fs6', 'A6',
  'C7', 'Ds7', 'Fs7', 'A7',
  'C8',
];

class AudioEngine {
  private sampler: Tone.Sampler | null = null;
  private isReady = false;
  private volume = -6; // dB

  /** Initialize and load the sampler. Must be called after a user gesture. */
  async init(): Promise<void> {
    if (this.sampler) return;

    await Tone.start();

    const urls: Record<string, string> = {};
    SAMPLE_NOTES.forEach((note) => {
      // Convert Ds4 notation to D#4 for Tone.js
      const toneNote = note.replace('s', '#');
      urls[toneNote] = `${note}.mp3`;
    });

    return new Promise((resolve, reject) => {
      this.sampler = new Tone.Sampler({
        urls,
        baseUrl: SALAMANDER_BASE,
        release: 1,
        onload: () => {
          this.isReady = true;
          resolve();
        },
        onerror: (err) => reject(err),
      }).toDestination();

      this.sampler.volume.value = this.volume;
    });
  }

  /** Play a MIDI note. velocity 0-127. */
  playNote(midi: number, velocity = 80, duration = '8n'): void {
    if (!this.sampler || !this.isReady) return;
    // Convert MIDI number to note name for Tone.Sampler compatibility
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    const gainVal = velocity / 127;
    this.sampler.triggerAttackRelease(noteName, duration, Tone.now(), gainVal);
  }

  /** Trigger note attack (sustain until release is called). */
  attackNote(midi: number, velocity = 80): void {
    if (!this.sampler || !this.isReady) return;
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    this.sampler.triggerAttack(noteName, Tone.now(), velocity / 127);
  }

  /** Release a sustained note. */
  releaseNote(midi: number): void {
    if (!this.sampler || !this.isReady) return;
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    this.sampler.triggerRelease(noteName, Tone.now());
  }

  /** Set volume in dB (-60 to 0) */
  setVolume(db: number): void {
    this.volume = db;
    if (this.sampler) this.sampler.volume.value = db;
  }

  get ready(): boolean {
    return this.isReady;
  }
}

// Singleton instance shared across the app
export const audioEngine = new AudioEngine();
