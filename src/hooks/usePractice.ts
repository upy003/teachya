import { useEffect, useRef, useCallback } from 'react';
import { useScoreStore } from '../stores/scoreStore';
import { usePracticeStore } from '../stores/practiceStore';
import { useMIDIStore } from '../stores/midiStore';
import {
  buildNoteTimeline,
  getExpectedNotesAtBeat,
  playGuidanceNotes,
} from '../lib/practice/PracticeEngine';
import { audioEngine } from '../lib/audio/AudioEngine';
import type { NoteTimeline } from '../types/Score';

/**
 * usePractice is the central practice session hook.
 * It manages the game loop, note matching, and state transitions.
 */
export function usePractice() {
  const { score } = useScoreStore();
  const {
    config,
    playbackState,
    currentBeat,
    nextNoteIndex,
    setPlaybackState,
    setCurrentBeat,
    setNextNoteIndex,
    recordCorrect,
    recordMissed,
    resetSession,
  } = usePracticeStore();

  const { lastNoteEvent } = useMIDIStore();

  // Mutable refs to avoid stale closures in the game loop
  const timelineRef = useRef<NoteTimeline>([]);
  const beatRef = useRef(currentBeat);
  const nextIndexRef = useRef(nextNoteIndex);
  const lastTickTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const waitingForNotesRef = useRef<Set<number>>(new Set());

  beatRef.current = currentBeat;
  nextIndexRef.current = nextNoteIndex;

  // Rebuild timeline whenever score or config changes
  useEffect(() => {
    if (score) {
      timelineRef.current = buildNoteTimeline(score, config);
    }
  }, [score, config]);

  /** The main game loop tick, called every ~16ms */
  const tick = useCallback(
    (timestamp: number) => {
      if (playbackState !== 'playing') return;

      const delta = lastTickTimeRef.current
        ? (timestamp - lastTickTimeRef.current) / 1000
        : 0;
      lastTickTimeRef.current = timestamp;

      const bpm = (score?.defaultTempo ?? 120) * config.tempoMultiplier;
      const beatsPerSecond = bpm / 60;
      const timeline = timelineRef.current;

      if (config.style === 'stream') {
        // In stream mode, advance playhead automatically at tempo
        const newBeat = beatRef.current + delta * beatsPerSecond;

        // Check for notes that should have been played (in the window we just passed)
        const expectedNow = getExpectedNotesAtBeat(timeline, newBeat, 0.08);
        if (config.guidanceAudio && expectedNow.length > 0) {
          playGuidanceNotes(timeline, newBeat, 0.08);
        }

        setCurrentBeat(newBeat);

        // Advance next note index
        while (
          nextIndexRef.current < timeline.length &&
          timeline[nextIndexRef.current].startTime < newBeat - 0.1
        ) {
          nextIndexRef.current++;
        }
        setNextNoteIndex(nextIndexRef.current);

        // End of piece
        if (score && newBeat >= score.totalBeats) {
          setPlaybackState('finished');
          return;
        }
      } else {
        // In waitForNote mode, the playhead only advances when the player presses notes
        // (handled in the MIDI effect below)
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [playbackState, score, config, setCurrentBeat, setNextNoteIndex, setPlaybackState],
  );

  // Start/stop the game loop
  useEffect(() => {
    if (playbackState === 'playing') {
      lastTickTimeRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playbackState, tick]);

  // Handle incoming MIDI note events for note matching
  useEffect(() => {
    if (!lastNoteEvent?.isNoteOn || playbackState !== 'playing') return;

    const timeline = timelineRef.current;
    const midi = lastNoteEvent.midi;

    if (config.style === 'waitForNote') {
      // Find expected notes at or near the current playhead
      const expected = getExpectedNotesAtBeat(timeline, beatRef.current, 0.5);
      const expectedMidis = expected.map((n) => n.midi);

      if (expectedMidis.includes(midi)) {
        recordCorrect();
        waitingForNotesRef.current.delete(midi);

        // Collect all unique start times of notes we just hit
        const hitBeat = expected.find((n) => n.midi === midi)?.startTime ?? beatRef.current;

        // Advance playhead to the next note position when all required notes are hit
        const allAtBeat = timeline.filter((n) => Math.abs(n.startTime - hitBeat) < 0.05);
        const allHit = allAtBeat.every((n) => !waitingForNotesRef.current.has(n.midi ?? -1));

        if (allHit || waitingForNotesRef.current.size === 0) {
          // Find the next note's startTime and jump there
          const nextNote = timeline[nextIndexRef.current];
          if (nextNote) {
            setCurrentBeat(nextNote.startTime);
            // Build the set of notes we need to wait for
            const nextBeatNotes = getExpectedNotesAtBeat(timeline, nextNote.startTime, 0.05);
            waitingForNotesRef.current = new Set(
              nextBeatNotes.map((n) => n.midi).filter((m): m is number => m !== null),
            );
            setNextNoteIndex(nextIndexRef.current + 1);
          } else {
            // End of piece
            setPlaybackState('finished');
          }
        }
      } else {
        // Wrong note played
        recordMissed();
      }

      // Play guidance audio regardless
      if (config.guidanceAudio) {
        const expected2 = getExpectedNotesAtBeat(timeline, beatRef.current, 0.5);
        expected2.forEach((n) => {
          if (n.midi !== null) audioEngine.playNote(n.midi, 70);
        });
      }
    }
  }, [lastNoteEvent, playbackState, config, recordCorrect, recordMissed, setCurrentBeat, setNextNoteIndex, setPlaybackState]);

  /** Start a practice session */
  const startSession = useCallback(() => {
    if (!score) return;
    resetSession();
    const timeline = timelineRef.current;
    if (timeline.length > 0) {
      const firstBeat = timeline[0].startTime;
      setCurrentBeat(firstBeat);
      const firstNotes = getExpectedNotesAtBeat(timeline, firstBeat, 0.05);
      waitingForNotesRef.current = new Set(
        firstNotes.map((n) => n.midi).filter((m): m is number => m !== null),
      );
    }
    setPlaybackState('playing');
  }, [score, resetSession, setCurrentBeat, setPlaybackState]);

  /** Pause or resume */
  const togglePause = useCallback(() => {
    if (playbackState === 'playing') {
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      setPlaybackState('playing');
    }
  }, [playbackState, setPlaybackState]);

  /** Stop and reset */
  const stopSession = useCallback(() => {
    setPlaybackState('idle');
    resetSession();
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
