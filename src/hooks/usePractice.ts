import { useEffect, useRef, useCallback } from 'react';
import { useScoreStore } from '../stores/scoreStore';
import { usePracticeStore } from '../stores/practiceStore';
import { useMIDIStore } from '../stores/midiStore';
import {
  buildNoteTimeline,
  getExpectedNotesAtBeat,
} from '../lib/practice/PracticeEngine';
import { audioEngine } from '../lib/audio/AudioEngine';
import type { NoteTimeline } from '../types/Score';

/**
 * usePractice is the central practice session hook.
 * IMPORTANT: This hook must be called only ONCE per practice session
 * to avoid duplicate game loops. Call it in PracticePage and pass
 * startSession/togglePause/stopSession as props where needed.
 */
export function usePractice() {
  const { score } = useScoreStore();
  const {
    config,
    playbackState,
    currentBeat,
    setPlaybackState,
    setCurrentBeat,
    setNextNoteIndex,
    recordCorrect,
    recordMissed,
    resetSession,
  } = usePracticeStore();

  const { lastNoteEvent } = useMIDIStore();

  // --- Mutable refs (avoid stale closures in the async RAF loop) ---
  const timelineRef = useRef<NoteTimeline>([]);
  const beatRef = useRef(0);             // Ground truth for current beat (updated in-loop)
  const nextIndexRef = useRef(0);
  const lastTickTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const waitingForNotesRef = useRef<Set<number>>(new Set());

  // Snapshot refs for config/score so the tick doesn't need deps
  const configRef = useRef(config);
  const scoreRef = useRef(score);
  const playbackStateRef = useRef(playbackState);
  const setCurrentBeatRef = useRef(setCurrentBeat);
  const setNextNoteIndexRef = useRef(setNextNoteIndex);
  const setPlaybackStateRef = useRef(setPlaybackState);
  const recordCorrectRef = useRef(recordCorrect);
  const recordMissedRef = useRef(recordMissed);

  // Keep all snapshot refs up-to-date on every render (runs during render phase)
  configRef.current = config;
  scoreRef.current = score;
  playbackStateRef.current = playbackState;
  setCurrentBeatRef.current = setCurrentBeat;
  setNextNoteIndexRef.current = setNextNoteIndex;
  setPlaybackStateRef.current = setPlaybackState;
  recordCorrectRef.current = recordCorrect;
  recordMissedRef.current = recordMissed;

  // Rebuild timeline whenever score or config changes
  useEffect(() => {
    if (score) {
      timelineRef.current = buildNoteTimeline(score, config);
    }
  }, [score, config]);

  /**
   * The tick function stored in a ref so it is always up-to-date inside RAF.
   * RAF always calls tickRef.current() which is the latest version.
   */
  const tickRef = useRef<(timestamp: number) => void>(() => {});

  tickRef.current = (timestamp: number) => {
    if (playbackStateRef.current !== 'playing') return;

    const delta = lastTickTimeRef.current
      ? (timestamp - lastTickTimeRef.current) / 1000
      : 0;
    lastTickTimeRef.current = timestamp;

    const cfg = configRef.current;
    const sc = scoreRef.current;
    const bpm = (sc?.defaultTempo ?? 120) * cfg.tempoMultiplier;
    const beatsPerSecond = bpm / 60;
    const timeline = timelineRef.current;

    if (cfg.style === 'stream') {
      // Advance the beat position forward by elapsed time
      const newBeat = beatRef.current + delta * beatsPerSecond;

      // Play guidance audio for notes that we just passed
      if (cfg.guidanceAudio && audioEngine.ready) {
        for (const note of timeline) {
          // A note falls within the window we just advanced over
          if (
            note.midi !== null &&
            !note.isRest &&
            note.startTime > beatRef.current &&
            note.startTime <= newBeat
          ) {
            audioEngine.playNote(note.midi, 65);
          }
        }
      }

      // Update beat ref IMMEDIATELY (before React re-render)
      beatRef.current = newBeat;
      setCurrentBeatRef.current(newBeat);

      // Advance the next-note index pointer
      while (
        nextIndexRef.current < timeline.length &&
        timeline[nextIndexRef.current]!.startTime < newBeat - 0.05
      ) {
        nextIndexRef.current++;
      }
      setNextNoteIndexRef.current(nextIndexRef.current);

      // End of piece
      if (sc && newBeat >= sc.totalBeats) {
        setPlaybackStateRef.current('finished');
        return;
      }
    }
    // In waitForNote mode the beat is advanced by MIDI events (handled below)

    // Schedule next frame using the ref to always call the latest tick version
    rafRef.current = requestAnimationFrame(tickRef.current);
  };

  // --- Game loop lifecycle: start/stop when playbackState changes ---
  useEffect(() => {
    if (playbackState === 'playing') {
      lastTickTimeRef.current = null;
      rafRef.current = requestAnimationFrame(tickRef.current);
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playbackState]); // Only restart loop on playbackState change

  // --- MIDI note matching for waitForNote mode ---
  useEffect(() => {
    if (!lastNoteEvent?.isNoteOn || playbackState !== 'playing') return;

    const timeline = timelineRef.current;
    const midi = lastNoteEvent.midi;
    const cfg = configRef.current;

    if (cfg.style === 'waitForNote') {
      // Look for the expected note(s) at or near the current beat position
      const expected = getExpectedNotesAtBeat(timeline, beatRef.current, 0.3);
      const expectedMidis = expected.map((n) => n.midi);

      if (expectedMidis.includes(midi)) {
        recordCorrectRef.current();
        waitingForNotesRef.current.delete(midi);

        const hitBeat =
          expected.find((n) => n.midi === midi)?.startTime ?? beatRef.current;

        // Check if all required notes at this beat have been played
        const allAtBeat = timeline.filter(
          (n) => Math.abs(n.startTime - hitBeat) < 0.05,
        );
        const allHit = allAtBeat.every(
          (n) => n.midi === null || !waitingForNotesRef.current.has(n.midi),
        );

        if (allHit || waitingForNotesRef.current.size === 0) {
          // Find the next note group and jump there
          const nextNote = timeline[nextIndexRef.current];
          if (nextNote) {
            const nextBeat = nextNote.startTime;
            beatRef.current = nextBeat;
            setCurrentBeatRef.current(nextBeat);

            const nextBeatNotes = getExpectedNotesAtBeat(
              timeline,
              nextBeat,
              0.05,
            );
            waitingForNotesRef.current = new Set(
              nextBeatNotes
                .map((n) => n.midi)
                .filter((m): m is number => m !== null),
            );
            nextIndexRef.current++;
            setNextNoteIndexRef.current(nextIndexRef.current);
          } else {
            setPlaybackStateRef.current('finished');
          }
        }
      } else {
        // Wrong note
        recordMissedRef.current();
      }
    }
  }, [lastNoteEvent, playbackState]);

  // --- Session controls ---
  const startSession = useCallback(async () => {
    if (!score) return;

    // Auto-initialize the audio engine on Play (browser requires a user gesture)
    if (!audioEngine.ready) {
      audioEngine.init().catch(console.warn);
    }

    resetSession();
    const timeline = buildNoteTimeline(score, config);
    timelineRef.current = timeline;

    if (timeline.length > 0) {
      const firstBeat = timeline[0]!.startTime;
      beatRef.current = firstBeat;
      nextIndexRef.current = 0;
      setCurrentBeat(firstBeat);

      const firstNotes = getExpectedNotesAtBeat(timeline, firstBeat, 0.05);
      waitingForNotesRef.current = new Set(
        firstNotes.map((n) => n.midi).filter((m): m is number => m !== null),
      );
    } else {
      beatRef.current = 0;
      nextIndexRef.current = 0;
    }

    setPlaybackState('playing');
  }, [score, config, resetSession, setCurrentBeat, setPlaybackState]);

  const togglePause = useCallback(() => {
    if (playbackState === 'playing') {
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      lastTickTimeRef.current = null; // Reset delta on resume to avoid jump
      setPlaybackState('playing');
    }
  }, [playbackState, setPlaybackState]);

  const stopSession = useCallback(() => {
    setPlaybackState('idle');
    resetSession();
    beatRef.current = 0;
    nextIndexRef.current = 0;
  }, [setPlaybackState, resetSession]);

  return {
    startSession,
    togglePause,
    stopSession,
    currentBeat,
    playbackState,
    timeline: timelineRef.current,
  };
}
