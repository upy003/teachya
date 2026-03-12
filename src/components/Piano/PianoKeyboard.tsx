import { useMemo } from 'react';
import clsx from 'clsx';
import { useMIDIStore } from '../../stores/midiStore';

/** MIDI note number for the lowest key (A0 = 21) */
const FIRST_KEY = 21;
/** Total number of piano keys */
const KEY_COUNT = 88;
/** Which semitones within an octave are black keys */
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10]);

interface KeyState {
  midi: number;
  isBlack: boolean;
  /** How many white keys come before this key */
  whiteIndex: number;
}

/** Pre-compute all 88 key descriptors */
function buildKeys(): KeyState[] {
  const keys: KeyState[] = [];
  let whiteIndex = 0;
  for (let i = 0; i < KEY_COUNT; i++) {
    const midi = FIRST_KEY + i;
    const semitone = midi % 12;
    const isBlack = BLACK_SEMITONES.has(semitone);
    keys.push({ midi, isBlack, whiteIndex: isBlack ? whiteIndex - 1 : whiteIndex });
    if (!isBlack) whiteIndex++;
  }
  return keys;
}

const ALL_KEYS = buildKeys();
const WHITE_KEY_COUNT = ALL_KEYS.filter((k) => !k.isBlack).length; // 52

interface PianoKeyboardProps {
  /** Highlighted keys mapped to their state color */
  highlights?: Map<number, 'correct' | 'wrong' | 'expected' | 'active'>;
  /** Whether to show note names on white keys */
  showNoteNames?: boolean;
  /** Height of the keyboard in pixels */
  height?: number;
}

const STATE_COLORS = {
  correct: 'bg-emerald-500 shadow-emerald-500/60',
  wrong: 'bg-red-500 shadow-red-500/60',
  expected: 'bg-violet-500 shadow-violet-500/60',
  active: 'bg-sky-400 shadow-sky-400/60',
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Full 88-key visual piano keyboard with per-key highlight support */
export function PianoKeyboard({ highlights, showNoteNames = false, height = 160 }: PianoKeyboardProps) {
  const { activeNotes } = useMIDIStore();

  // Merge MIDI active notes into highlights as 'active'
  const mergedHighlights = useMemo(() => {
    const map = new Map(highlights ?? []);
    activeNotes.forEach((midi) => {
      if (!map.has(midi)) map.set(midi, 'active');
    });
    return map;
  }, [highlights, activeNotes]);

  const whiteKeyWidth = 100 / WHITE_KEY_COUNT; // percent
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const blackKeyHeight = height * 0.6;

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-t-lg"
      style={{ height }}
      aria-label="Piano keyboard"
    >
      {/* White keys layer */}
      {ALL_KEYS.filter((k) => !k.isBlack).map((key) => {
        const state = mergedHighlights.get(key.midi);
        const noteName = NOTE_NAMES[key.midi % 12];
        const showOctaveLabel = noteName === 'C';
        const octave = Math.floor(key.midi / 12) - 1;

        return (
          <div
            key={key.midi}
            style={{
              left: `${key.whiteIndex * whiteKeyWidth}%`,
              width: `${whiteKeyWidth}%`,
              height: '100%',
            }}
            className={clsx(
              'absolute border-r border-neutral-700 rounded-b-md transition-all duration-75',
              state
                ? clsx(STATE_COLORS[state], 'shadow-lg shadow-inner')
                : 'bg-neutral-100 hover:bg-neutral-200',
            )}
          >
            {/* Note labels at the bottom */}
            {showNoteNames && (
              <div className="absolute bottom-2 inset-x-0 flex flex-col items-center">
                {showOctaveLabel && (
                  <span className="text-[9px] font-bold text-neutral-400">{noteName}{octave}</span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Black keys layer (rendered on top) */}
      {ALL_KEYS.filter((k) => k.isBlack).map((key) => {
        const state = mergedHighlights.get(key.midi);
        return (
          <div
            key={key.midi}
            style={{
              left: `${key.whiteIndex * whiteKeyWidth + whiteKeyWidth * 0.7}%`,
              width: `${blackKeyWidth}%`,
              height: blackKeyHeight,
            }}
            className={clsx(
              'absolute z-10 rounded-b-md transition-all duration-75',
              state
                ? clsx(STATE_COLORS[state], 'shadow-lg')
                : 'bg-neutral-900 hover:bg-neutral-800',
            )}
          />
        );
      })}
    </div>
  );
}
