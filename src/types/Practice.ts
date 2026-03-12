// Types related to the practice session state and engine

/** Practice display mode */
export type PracticeMode = 'falling' | 'sheet';

/** Which hands are active during practice */
export type HandMode = 'both' | 'right' | 'left';

/** Session playback state */
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'finished';

/** Whether we wait for the player or auto-advance */
export type PracticeStyle = 'waitForNote' | 'stream';

/** Result of a single note attempt */
export interface NoteAttempt {
  /** Expected MIDI note */
  expectedMidi: number;
  /** What the player actually played (null = missed) */
  playedMidi: number | null;
  /** True if correct */
  correct: boolean;
  /** Reaction time in milliseconds */
  reactionMs?: number;
}

/** Overall session statistics */
export interface SessionStats {
  totalNotes: number;
  correctNotes: number;
  missedNotes: number;
  /** Accuracy percentage 0-100 */
  accuracy: number;
  /** Longest correct streak */
  bestStreak: number;
  /** Current streak */
  currentStreak: number;
}

/** A-B loop section markers (in quarter-note beats) */
export interface LoopSection {
  startBeat: number;
  endBeat: number;
  enabled: boolean;
}

/** Complete practice session configuration */
export interface PracticeConfig {
  mode: PracticeMode;
  handMode: HandMode;
  style: PracticeStyle;
  /** Tempo multiplier: 0.25 = 25%, 1.0 = 100%, 2.0 = 200% */
  tempoMultiplier: number;
  loop: LoopSection;
  /** Show note names on keys */
  showNoteNames: boolean;
  /** Play guidance audio (expected notes) */
  guidanceAudio: boolean;
}

/** State of a single falling note rectangle */
export interface FallingNoteRect {
  /** Unique ID */
  id: string;
  /** MIDI note number */
  midi: number;
  /** Y position in pixels (0 = top, increases downward) */
  y: number;
  /** Height in pixels (proportional to duration) */
  height: number;
  /** Current hit state */
  state: 'upcoming' | 'hitting' | 'hit' | 'missed';
  /** Column index (0-87 for 88-key piano) */
  column: number;
}
