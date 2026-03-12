import { create } from 'zustand';
import type {
  PracticeConfig,
  PracticeMode,
  HandMode,
  PracticeStyle,
  PlaybackState,
  SessionStats,
  LoopSection,
} from '../types/Practice';

/** Default practice configuration */
const defaultConfig: PracticeConfig = {
  mode: 'falling',
  handMode: 'both',
  style: 'waitForNote',
  tempoMultiplier: 1.0,
  loop: { startBeat: 0, endBeat: 0, enabled: false },
  showNoteNames: false,
  guidanceAudio: true,
};

/** Default session statistics */
const defaultStats: SessionStats = {
  totalNotes: 0,
  correctNotes: 0,
  missedNotes: 0,
  accuracy: 100,
  bestStreak: 0,
  currentStreak: 0,
};

interface PracticeState {
  config: PracticeConfig;
  playbackState: PlaybackState;
  /** Current position in quarter-note beats */
  currentBeat: number;
  /** Index of the next expected note in the timeline */
  nextNoteIndex: number;
  stats: SessionStats;

  // Config actions
  setMode: (mode: PracticeMode) => void;
  setHandMode: (hand: HandMode) => void;
  setStyle: (style: PracticeStyle) => void;
  setTempo: (multiplier: number) => void;
  setLoop: (loop: LoopSection) => void;
  toggleGuidanceAudio: () => void;
  toggleShowNoteNames: () => void;

  // Session actions
  setPlaybackState: (state: PlaybackState) => void;
  setCurrentBeat: (beat: number) => void;
  setNextNoteIndex: (index: number) => void;
  recordCorrect: () => void;
  recordMissed: () => void;
  resetSession: () => void;
}

export const usePracticeStore = create<PracticeState>((set) => ({
  config: defaultConfig,
  playbackState: 'idle',
  currentBeat: 0,
  nextNoteIndex: 0,
  stats: defaultStats,

  setMode: (mode) => set((s) => ({ config: { ...s.config, mode } })),
  setHandMode: (handMode) => set((s) => ({ config: { ...s.config, handMode } })),
  setStyle: (style) => set((s) => ({ config: { ...s.config, style } })),
  setTempo: (tempoMultiplier) =>
    set((s) => ({ config: { ...s.config, tempoMultiplier } })),
  setLoop: (loop) => set((s) => ({ config: { ...s.config, loop } })),
  toggleGuidanceAudio: () =>
    set((s) => ({ config: { ...s.config, guidanceAudio: !s.config.guidanceAudio } })),
  toggleShowNoteNames: () =>
    set((s) => ({ config: { ...s.config, showNoteNames: !s.config.showNoteNames } })),

  setPlaybackState: (playbackState) => set({ playbackState }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
  setNextNoteIndex: (nextNoteIndex) => set({ nextNoteIndex }),

  recordCorrect: () =>
    set((s) => {
      const streak = s.stats.currentStreak + 1;
      const total = s.stats.totalNotes + 1;
      const correct = s.stats.correctNotes + 1;
      return {
        stats: {
          totalNotes: total,
          correctNotes: correct,
          missedNotes: s.stats.missedNotes,
          accuracy: Math.round((correct / total) * 100),
          bestStreak: Math.max(s.stats.bestStreak, streak),
          currentStreak: streak,
        },
      };
    }),

  recordMissed: () =>
    set((s) => {
      const total = s.stats.totalNotes + 1;
      const missed = s.stats.missedNotes + 1;
      return {
        stats: {
          totalNotes: total,
          correctNotes: s.stats.correctNotes,
          missedNotes: missed,
          accuracy: Math.round((s.stats.correctNotes / total) * 100),
          bestStreak: s.stats.bestStreak,
          currentStreak: 0,
        },
      };
    }),

  resetSession: () =>
    set({ playbackState: 'idle', currentBeat: 0, nextNoteIndex: 0, stats: defaultStats }),
}));
