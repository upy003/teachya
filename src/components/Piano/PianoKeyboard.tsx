import { useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { useMIDIStore } from '../../stores/midiStore';
import { audioEngine } from '../../lib/audio/AudioEngine';
import type { MIDINoteEvent } from '../../types/MIDI';

const FIRST_KEY = 21; // A0
const KEY_COUNT = 88;
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10]);
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface KeyInfo {
  midi: number;
  isBlack: boolean;
  whiteIndex: number;
}

function buildKeys(): KeyInfo[] {
  const keys: KeyInfo[] = [];
  let whiteIndex = 0;
  for (let i = 0; i < KEY_COUNT; i++) {
    const midi = FIRST_KEY + i;
    const isBlack = BLACK_SEMITONES.has(midi % 12);
    keys.push({ midi, isBlack, whiteIndex: isBlack ? whiteIndex - 1 : whiteIndex });
    if (!isBlack) whiteIndex++;
  }
  return keys;
}

const ALL_KEYS = buildKeys();
const WHITE_KEY_COUNT = ALL_KEYS.filter((k) => !k.isBlack).length; // 52

interface PianoKeyboardProps {
  highlights?: Map<number, 'correct' | 'wrong' | 'expected' | 'active'>;
  showNoteNames?: boolean;
  height?: number;
}

const STATE_COLORS = {
  correct: 'bg-emerald-500',
  wrong: 'bg-red-500',
  expected: 'bg-violet-500',
  active: 'bg-sky-400',
};

/**
 * 88-key visual piano keyboard.
 * Clicking keys triggers virtual MIDI note-on/off events so the
 * practice engine works even without a hardware piano.
 */
export function PianoKeyboard({ highlights, showNoteNames = false, height = 140 }: PianoKeyboardProps) {
  const { activeNotes, noteOn, noteOff } = useMIDIStore();

  // Merge MIDI active notes into highlights as 'active'
  const mergedHighlights = useMemo(() => {
    const map = new Map(highlights ?? []);
    activeNotes.forEach((midi) => {
      if (!map.has(midi)) map.set(midi, 'active');
    });
    return map;
  }, [highlights, activeNotes]);

  /** Trigger a virtual note-on from a mouse/touch click on the keyboard */
  const handleNoteOn = useCallback((midi: number) => {
    const event: MIDINoteEvent = {
      midi,
      name: NOTE_NAMES[midi % 12] + Math.floor(midi / 12 - 1),
      velocity: 80,
      timestamp: performance.now(),
      isNoteOn: true,
    };
    noteOn(event);
    // Also play audio
    if (audioEngine.ready) {
      audioEngine.attackNote(midi, 80);
    } else {
      // Auto-init on first click (user gesture)
      audioEngine.init().then(() => audioEngine.attackNote(midi, 80)).catch(() => {});
    }
  }, [noteOn]);

  const handleNoteOff = useCallback((midi: number) => {
    noteOff(midi);
    if (audioEngine.ready) {
      audioEngine.releaseNote(midi);
    }
  }, [noteOff]);

  const whiteKeyWidth = 100 / WHITE_KEY_COUNT;
  const blackKeyWidth = whiteKeyWidth * 0.62;
  const blackKeyHeight = height * 0.62;

  return (
    <div
      className="relative w-full select-none overflow-hidden"
      style={{ height }}
      aria-label="Piano keyboard"
    >
      {/* White keys */}
      {ALL_KEYS.filter((k) => !k.isBlack).map((key) => {
        const state = mergedHighlights.get(key.midi);
        const noteName = NOTE_NAMES[key.midi % 12]!;
        const isC = noteName === 'C';
        const octave = Math.floor(key.midi / 12) - 1;

        return (
          <div
            key={key.midi}
            onMouseDown={() => handleNoteOn(key.midi)}
            onMouseUp={() => handleNoteOff(key.midi)}
            onMouseLeave={() => { if (activeNotes.has(key.midi)) handleNoteOff(key.midi); }}
            onTouchStart={(e) => { e.preventDefault(); handleNoteOn(key.midi); }}
            onTouchEnd={() => handleNoteOff(key.midi)}
            style={{
              left: `${key.whiteIndex * whiteKeyWidth}%`,
              width: `${whiteKeyWidth}%`,
              height: '100%',
            }}
            className={clsx(
              'absolute border-r border-neutral-700 rounded-b-sm cursor-pointer',
              'transition-colors duration-75',
              state
                ? STATE_COLORS[state]
                : 'bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300',
            )}
          >
            {showNoteNames && isC && (
              <div className="absolute bottom-1 inset-x-0 flex justify-center">
                <span className="text-[8px] font-bold text-neutral-400/80">
                  {noteName}{octave}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Black keys (rendered on top) */}
      {ALL_KEYS.filter((k) => k.isBlack).map((key) => {
        const state = mergedHighlights.get(key.midi);
        return (
          <div
            key={key.midi}
            onMouseDown={(e) => { e.stopPropagation(); handleNoteOn(key.midi); }}
            onMouseUp={(e) => { e.stopPropagation(); handleNoteOff(key.midi); }}
            onMouseLeave={() => { if (activeNotes.has(key.midi)) handleNoteOff(key.midi); }}
            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleNoteOn(key.midi); }}
            onTouchEnd={(e) => { e.stopPropagation(); handleNoteOff(key.midi); }}
            style={{
              left: `${key.whiteIndex * whiteKeyWidth + whiteKeyWidth * 0.69}%`,
              width: `${blackKeyWidth}%`,
              height: blackKeyHeight,
            }}
            className={clsx(
              'absolute z-10 rounded-b-sm cursor-pointer',
              'transition-colors duration-75',
              state
                ? STATE_COLORS[state]
                : 'bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700',
            )}
          />
        );
      })}
    </div>
  );
}
