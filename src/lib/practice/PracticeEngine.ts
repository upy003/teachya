import type { Score, Note, NoteTimeline } from '../../types/Score';
import type { PracticeConfig, FallingNoteRect, SessionStats } from '../../types/Practice';
import { audioEngine } from '../audio/AudioEngine';

/** Pixels per beat at 100% tempo (used for falling notes speed) */
export const PX_PER_BEAT = 120;

/** Height of the hit zone at the bottom of the falling notes canvas */
export const HIT_ZONE_HEIGHT = 80;

/**
 * Extract all non-rest notes from a score, flattened and sorted by startTime.
 * Applies hand filtering based on PracticeConfig.
 */
export function buildNoteTimeline(score: Score, config: PracticeConfig): NoteTimeline {
  const allNotes: Note[] = [];
  for (const measure of score.measures) {
    for (const note of measure.notes) {
      if (note.isRest || note.midi === null) continue;
      // Filter by hand/staff
      if (config.handMode === 'right' && note.staff !== 1) continue;
      if (config.handMode === 'left' && note.staff !== 2) continue;
      allNotes.push(note);
    }
  }
  return allNotes.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Convert a note timeline to falling note rectangles for canvas rendering.
 * @param timeline - sorted note timeline
 * @param canvasHeight - total height of the canvas
 * @param bpm - actual beats per minute after tempo multiplier
 * @param currentBeat - current playhead position in beats
 */
export function buildFallingRects(
  timeline: NoteTimeline,
  canvasHeight: number,
  bpm: number,
  currentBeat: number,
): FallingNoteRect[] {
  // Seconds per beat
  const secPerBeat = 60 / bpm;
  // Pixels per second
  const pxPerSec = (canvasHeight - HIT_ZONE_HEIGHT) / 3; // 3 seconds look-ahead

  return timeline
    .filter((note) => {
      // Only render notes within a visible window (current to +4 beats look-ahead)
      const relStart = note.startTime - currentBeat;
      return relStart > -note.duration && relStart < (canvasHeight / (pxPerSec * secPerBeat)) + 1;
    })
    .map((note) => {
      const relStart = note.startTime - currentBeat;
      // Y: top of the canvas is furthest future, bottom is the hit zone
      const y = canvasHeight - HIT_ZONE_HEIGHT - relStart * pxPerSec * secPerBeat;
      const height = note.duration * pxPerSec * secPerBeat;
      const column = (note.midi ?? 60) - 21; // Piano key column 0-87

      return {
        id: `${note.startTime}-${note.midi}-${note.staff}`,
        midi: note.midi ?? 60,
        y,
        height: Math.max(height, 8),
        state: 'upcoming' as const,
        column,
      };
    });
}

/**
 * Check if a played MIDI note matches any of the expected notes at the current beat.
 * Returns the matched note or null.
 */
export function matchNote(
  playedMidi: number,
  timeline: NoteTimeline,
  nextIndex: number,
): Note | null {
  // Look ahead in the timeline for a matching note within tolerance
  for (let i = nextIndex; i < Math.min(nextIndex + 8, timeline.length); i++) {
    const note = timeline[i];
    if (note.midi === playedMidi) return note;
  }
  return null;
}

/**
 * Play guidance notes (what the player should press) at the given beat.
 * Used in stream mode to give audio feedback.
 */
export function playGuidanceNotes(
  timeline: NoteTimeline,
  beat: number,
  tolerance = 0.05,
): void {
  for (const note of timeline) {
    if (Math.abs(note.startTime - beat) < tolerance && note.midi !== null) {
      audioEngine.playNote(note.midi, 60, `${note.duration * 0.9}n`);
    }
  }
}

/**
 * Get all notes that should be pressed simultaneously at the given beat
 * (within a small tolerance window).
 */
export function getExpectedNotesAtBeat(
  timeline: NoteTimeline,
  beat: number,
  tolerance = 0.1,
): Note[] {
  return timeline.filter(
    (n) => n.startTime >= beat - tolerance && n.startTime <= beat + tolerance,
  );
}

/**
 * Calculate simple accuracy stats from attempt history.
 */
export function calculateStats(
  correct: number,
  total: number,
  streak: number,
  bestStreak: number,
): SessionStats {
  return {
    totalNotes: total,
    correctNotes: correct,
    missedNotes: total - correct,
    accuracy: total === 0 ? 100 : Math.round((correct / total) * 100),
    bestStreak,
    currentStreak: streak,
  };
}
