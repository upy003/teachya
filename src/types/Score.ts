// Core data types representing a parsed musical score

/** A single musical note or rest */
export interface Note {
  /** MIDI pitch number (21 = A0, 108 = C8). Null for rests. */
  midi: number | null;
  /** Note name with octave, e.g. "C4", "F#5". Null for rests. */
  name: string | null;
  /** Duration in quarter-note beats */
  duration: number;
  /** Absolute start time in quarter-note beats from beginning of score */
  startTime: number;
  /** Which staff (1 = treble/right hand, 2 = bass/left hand) */
  staff: 1 | 2;
  /** Voice within the staff */
  voice: number;
  /** Whether this is a rest */
  isRest: boolean;
  /** Visual display: tied note continuation */
  isTied?: boolean;
  /** Finger number hint (1-5) */
  finger?: number;
}

/** A measure/bar in the score */
export interface Measure {
  /** Measure number (1-indexed) */
  number: number;
  /** Notes in this measure */
  notes: Note[];
  /** Time signature numerator */
  timeSigNumerator: number;
  /** Time signature denominator */
  timeSigDenominator: number;
  /** Tempo in BPM (if a tempo marking exists at this measure) */
  tempo?: number;
}

/** Complete parsed score */
export interface Score {
  /** Title of the piece */
  title: string;
  /** Composer name */
  composer: string;
  /** All measures in the score */
  measures: Measure[];
  /** Default tempo in BPM */
  defaultTempo: number;
  /** Total duration in quarter-note beats */
  totalBeats: number;
  /** Raw MusicXML string for OSMD rendering */
  rawXml: string;
}

/** A flattened list of all notes for the practice engine */
export type NoteTimeline = Note[];
