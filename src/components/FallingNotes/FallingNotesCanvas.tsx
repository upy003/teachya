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
const FIRST_MIDI = 21; // A0
const KEY_COUNT = 88;
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10]);

/** Count white keys before a given MIDI note column */
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

/** Pre-compute white-key positions for all 88 keys (avoids per-frame loop) */
const KEY_POSITIONS = Array.from({ length: KEY_COUNT }, (_, i) => ({
  isBlack: BLACK_SEMITONES.has((FIRST_MIDI + i) % 12),
  whitesBefore: whiteKeysBefore(i),
}));

const COLORS = {
  right: { main: '#8b5cf6', glow: 'rgba(139,92,246,0.4)' },
  left: { main: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
  correct: '#22c55e',
  wrong: '#ef4444',
};

/**
 * Canvas-based falling notes visualizer.
 *
 * KEY DESIGN: All rapidly-changing values (currentBeat, activeNotes) are stored
 * in refs that are updated synchronously during render. The `draw` callback
 * does NOT include them in its dependency array, so the RAF loop is NEVER
 * restarted due to beat changes — it runs continuously at 60 fps.
 */
export function FallingNotesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const timelineRef = useRef<NoteTimeline>([]);
  const noteStateRef = useRef<Map<string, 'correct' | 'wrong'>>(new Map());

  // Refs for values that change frequently — avoid re-creating `draw`
  const currentBeatRef = useRef(0);
  const activeNotesRef = useRef<Set<number>>(new Set());
  const scoreRef = useRef<import('../../types/Score').Score | null>(null);
  const configRef = useRef<import('../../types/Practice').PracticeConfig | null>(null);

  // Read from stores (triggers re-render when they change, which updates refs)
  const { score } = useScoreStore();
  const { config, currentBeat, playbackState } = usePracticeStore();
  const { activeNotes } = useMIDIStore();

  // Update refs synchronously during render (before any effects run)
  currentBeatRef.current = currentBeat;
  activeNotesRef.current = activeNotes;
  scoreRef.current = score;
  configRef.current = config;

  // Rebuild timeline when score or config changes
  useEffect(() => {
    if (score) {
      timelineRef.current = buildNoteTimeline(score, config);
    } else {
      timelineRef.current = [];
    }
  }, [score, config]);

  // Clear feedback state on session reset
  useEffect(() => {
    if (playbackState === 'idle') {
      noteStateRef.current.clear();
    }
  }, [playbackState]);

  /**
   * The draw function reads ALL state from refs, so it never needs to be
   * recreated. This prevents the RAF restart-every-frame bug.
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    if (W === 0 || H === 0) return;

    const currentBeat = currentBeatRef.current;
    const activeNotes = activeNotesRef.current;
    const sc = scoreRef.current;
    const cfg = configRef.current;

    const bpm = (sc?.defaultTempo ?? 120) * (cfg?.tempoMultiplier ?? 1);
    const secPerBeat = 60 / bpm;

    // Look-ahead in seconds (visible future window)
    const lookAheadSec = 3.5;
    const pxPerSec = (H - HIT_ZONE_HEIGHT) / lookAheadSec;

    const whiteKeyWidth = W / WHITE_KEY_COUNT;
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const noteRadius = 4;
    const paddingX = 2;
    const hitY = H - HIT_ZONE_HEIGHT;

    // --- Background ---
    ctx.clearRect(0, 0, W, H);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#070710');
    bgGrad.addColorStop(1, '#0e0e1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // --- Lane guides ---
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i < KEY_COUNT; i++) {
      const { isBlack, whitesBefore } = KEY_POSITIONS[i]!;
      if (!isBlack) {
        const x = whitesBefore * whiteKeyWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, hitY);
        ctx.stroke();
      }
    }

    // --- Hit zone line ---
    ctx.strokeStyle = 'rgba(139,92,246,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(W, hitY);
    ctx.stroke();

    // --- Hit zone glow ---
    const hitGrad = ctx.createLinearGradient(0, hitY - 30, 0, hitY + 10);
    hitGrad.addColorStop(0, 'rgba(139,92,246,0.18)');
    hitGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = hitGrad;
    ctx.fillRect(0, hitY - 30, W, 40);

    // --- Falling notes ---
    const timeline = timelineRef.current;
    ctx.save();

    for (const note of timeline) {
      if (note.midi === null || note.isRest) continue;

      const relStart = note.startTime - currentBeat; // positive = in the future
      // bottomY = where the note bottom will be at hit time
      const bottomY = hitY - relStart * pxPerSec * secPerBeat;
      const noteH = Math.max(note.duration * pxPerSec * secPerBeat - 2, 10);
      const topY = bottomY - noteH;

      // Skip completely off-screen notes
      if (bottomY < 0 || topY > H) continue;

      const col = note.midi - FIRST_MIDI;
      if (col < 0 || col >= KEY_COUNT) continue;

      const { isBlack, whitesBefore } = KEY_POSITIONS[col]!;
      const noteX = isBlack
        ? whitesBefore * whiteKeyWidth + whiteKeyWidth * 0.7 + paddingX
        : whitesBefore * whiteKeyWidth + paddingX;
      const noteW = (isBlack ? blackKeyWidth : whiteKeyWidth) - paddingX * 2;

      // Color selection
      const noteId = `${note.startTime.toFixed(4)}-${note.midi}`;
      const hitState = noteStateRef.current.get(noteId);
      const isActive = activeNotes.has(note.midi);

      const staffKey = note.staff === 1 ? 'right' : 'left';
      let mainColor = COLORS[staffKey].main;
      let glowColor = COLORS[staffKey].glow;

      if (hitState === 'correct') {
        mainColor = COLORS.correct;
        glowColor = 'rgba(34,197,94,0.5)';
      } else if (hitState === 'wrong') {
        mainColor = COLORS.wrong;
        glowColor = 'rgba(239,68,68,0.5)';
      } else if (isActive) {
        mainColor = '#ffffff';
        glowColor = 'rgba(255,255,255,0.4)';
      }

      // Glow
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;

      // Note body (gradient top to bottom)
      const noteGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
      noteGrad.addColorStop(0, mainColor + 'ff');
      noteGrad.addColorStop(1, mainColor + 'aa');
      ctx.fillStyle = noteGrad;

      ctx.beginPath();
      ctx.roundRect(noteX, Math.max(topY, 0), noteW, Math.min(noteH, H), noteRadius);
      ctx.fill();

      // Highlight stripe at top
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.roundRect(noteX + 2, Math.max(topY + 2, 0), noteW - 4, 3, 1);
      ctx.fill();
    }

    ctx.restore();

    // --- Active note highlights in hit zone ---
    activeNotes.forEach((midi) => {
      const col = midi - FIRST_MIDI;
      if (col < 0 || col >= KEY_COUNT) return;

      const { isBlack, whitesBefore } = KEY_POSITIONS[col]!;
      const noteX = isBlack
        ? whitesBefore * whiteKeyWidth + whiteKeyWidth * 0.7 + paddingX
        : whitesBefore * whiteKeyWidth + paddingX;
      const noteW = (isBlack ? blackKeyWidth : whiteKeyWidth) - paddingX * 2;

      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.roundRect(noteX, hitY, noteW, HIT_ZONE_HEIGHT - 2, noteRadius);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, []); // NO deps — reads everything from refs!

  // --- Stable RAF animation loop (never restarts due to beat changes) ---
  useEffect(() => {
    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []); // Empty deps = starts once on mount, runs forever

  // --- Canvas resize observer ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    // Use absolute positioning to reliably fill the `relative` parent
    // regardless of flex/grid layout quirks that can cause h-full to be 0
    <canvas
      ref={canvasRef}
      className="block"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none',
      }}
      aria-label="Falling notes visualizer"
    />
  );
}
