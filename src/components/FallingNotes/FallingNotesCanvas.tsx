import { useEffect, useRef, useCallback } from 'react';
import { usePracticeStore } from '../../stores/practiceStore';
import { useScoreStore } from '../../stores/scoreStore';
import { useMIDIStore } from '../../stores/midiStore';
import {
  buildNoteTimeline,
  HIT_ZONE_HEIGHT,
} from '../../lib/practice/PracticeEngine';
import type { NoteTimeline } from '../../types/Score';

// Piano key geometry constants
const FIRST_MIDI = 21;  // A0
const KEY_COUNT = 88;
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10]);

/** Map MIDI note to its column (x position) in the canvas */
function midiToColumn(midi: number): number {
  return midi - FIRST_MIDI;
}

/** Count white keys up to (not including) the given column */
function whiteKeysBefore(column: number): number {
  let count = 0;
  for (let i = 0; i < column; i++) {
    if (!BLACK_SEMITONES.has((FIRST_MIDI + i) % 12)) count++;
  }
  return count;
}

const WHITE_KEY_COUNT = (() => {
  let c = 0;
  for (let i = 0; i < KEY_COUNT; i++) {
    if (!BLACK_SEMITONES.has((FIRST_MIDI + i) % 12)) c++;
  }
  return c; // 52
})();

/** Color palette for falling notes by staff */
const COLORS = {
  right: { main: '#8b5cf6', glow: 'rgba(139,92,246,0.4)' },  // violet
  left: { main: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },    // cyan
  correct: '#22c55e',  // green
  wrong: '#ef4444',    // red
};

/**
 * Canvas-based falling notes visualizer.
 * Notes fall from the top down toward the hit zone (piano keys).
 * Uses requestAnimationFrame for smooth 60fps rendering.
 */
export function FallingNotesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const timelineRef = useRef<NoteTimeline>([]);
  /** Tracks which notes have been hit/missed for color feedback */
  const noteStateRef = useRef<Map<string, 'correct' | 'wrong'>>(new Map());

  const { score } = useScoreStore();
  const { config, currentBeat, playbackState } = usePracticeStore();
  const { activeNotes } = useMIDIStore();

  // Rebuild timeline when score or config changes
  useEffect(() => {
    if (score) {
      timelineRef.current = buildNoteTimeline(score, config);
    }
  }, [score, config]);

  // Clear feedback state on session reset
  useEffect(() => {
    if (playbackState === 'idle') {
      noteStateRef.current.clear();
    }
  }, [playbackState]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const bpm = (score?.defaultTempo ?? 120) * config.tempoMultiplier;
    const secPerBeat = 60 / bpm;

    // Look-ahead in seconds (how much of the future to show)
    const lookAheadSec = 4;
    // Pixels per second of look-ahead
    const pxPerSec = (H - HIT_ZONE_HEIGHT) / lookAheadSec;

    const whiteKeyWidth = W / WHITE_KEY_COUNT;
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const noteRadius = 4;
    const paddingX = 2;

    // Clear canvas with gradient background
    ctx.clearRect(0, 0, W, H);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0a0a0f');
    bgGrad.addColorStop(1, '#111118');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Draw lane guides (subtle vertical lines for each key column)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let col = 0; col <= KEY_COUNT; col++) {
      const midi = FIRST_MIDI + col;
      const semitone = midi % 12;
      if (!BLACK_SEMITONES.has(semitone)) {
        const wx = whiteKeysBefore(col) * whiteKeyWidth;
        ctx.beginPath();
        ctx.moveTo(wx, 0);
        ctx.lineTo(wx, H - HIT_ZONE_HEIGHT);
        ctx.stroke();
      }
    }

    // Hit zone separator line
    const hitY = H - HIT_ZONE_HEIGHT;
    ctx.strokeStyle = 'rgba(139,92,246,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(W, hitY);
    ctx.stroke();

    // Hit zone glow
    const hitGrad = ctx.createLinearGradient(0, hitY - 20, 0, hitY + 20);
    hitGrad.addColorStop(0, 'rgba(139,92,246,0.15)');
    hitGrad.addColorStop(0.5, 'rgba(139,92,246,0.08)');
    hitGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = hitGrad;
    ctx.fillRect(0, hitY - 20, W, 40);

    // Draw falling notes
    const timeline = timelineRef.current;

    for (const note of timeline) {
      if (note.midi === null || note.isRest) continue;

      const relStart = note.startTime - currentBeat;
      // Y position of the bottom of the note (where it reaches the hit zone)
      const bottomY = hitY - relStart * pxPerSec * secPerBeat;
      const noteHeight = Math.max(note.duration * pxPerSec * secPerBeat - 2, 8);
      const topY = bottomY - noteHeight;

      // Skip notes that are completely off-screen
      if (bottomY < -noteHeight || topY > H) continue;

      const col = midiToColumn(note.midi);
      const semitone = note.midi % 12;
      const isBlack = BLACK_SEMITONES.has(semitone);
      const wx = whiteKeysBefore(col) * whiteKeyWidth;
      const noteX = isBlack
        ? wx + whiteKeyWidth * 0.7 + paddingX
        : wx + paddingX;
      const noteW = (isBlack ? blackKeyWidth : whiteKeyWidth) - paddingX * 2;

      // Determine color based on state
      const noteId = `${note.startTime}-${note.midi}`;
      const hitState = noteStateRef.current.get(noteId);
      const isActive = activeNotes.has(note.midi);

      const staff = note.staff === 1 ? 'right' : 'left';
      let mainColor = COLORS[staff].main;
      let glowColor = COLORS[staff].glow;

      if (hitState === 'correct') {
        mainColor = COLORS.correct;
        glowColor = 'rgba(34,197,94,0.4)';
      } else if (hitState === 'wrong') {
        mainColor = COLORS.wrong;
        glowColor = 'rgba(239,68,68,0.4)';
      } else if (isActive) {
        mainColor = '#ffffff';
        glowColor = 'rgba(255,255,255,0.3)';
      }

      // Glow effect
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;

      // Note rectangle with gradient
      const noteGrad = ctx.createLinearGradient(noteX, topY, noteX, bottomY);
      noteGrad.addColorStop(0, mainColor + 'ff');
      noteGrad.addColorStop(1, mainColor + 'bb');

      ctx.fillStyle = noteGrad;
      ctx.beginPath();
      ctx.roundRect(noteX, topY, noteW, noteHeight, noteRadius);
      ctx.fill();

      // Top highlight stripe
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.roundRect(noteX + 2, topY + 2, noteW - 4, 3, 1);
      ctx.fill();

      ctx.shadowBlur = 0;
    }

    // Highlight currently active MIDI notes in the hit zone
    activeNotes.forEach((midi) => {
      const col = midiToColumn(midi);
      if (col < 0 || col >= KEY_COUNT) return;
      const semitone = midi % 12;
      const isBlack = BLACK_SEMITONES.has(semitone);
      const wx = whiteKeysBefore(col) * whiteKeyWidth;
      const noteX = isBlack ? wx + whiteKeyWidth * 0.7 + paddingX : wx + paddingX;
      const noteW = (isBlack ? blackKeyWidth : whiteKeyWidth) - paddingX * 2;

      ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.roundRect(noteX, hitY - 12, noteW, HIT_ZONE_HEIGHT - 4, noteRadius);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [score, config, currentBeat, activeNotes]);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    resizeObserver.observe(canvas);
    // Initial size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: 'none' }}
      aria-label="Falling notes visualizer"
    />
  );
}
