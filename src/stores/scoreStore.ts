import { create } from 'zustand';
import type { Score } from '../types/Score';

/** State for the currently loaded musical score */
interface ScoreState {
  /** Currently loaded score, or null if none imported */
  score: Score | null;
  /** Whether a score is being parsed/loaded */
  isLoading: boolean;
  /** Error message from the last import attempt */
  importError: string | null;
  /** List of recently imported piece titles (persisted to localStorage) */
  recentTitles: string[];

  // Actions
  setScore: (score: Score) => void;
  setLoading: (loading: boolean) => void;
  setImportError: (error: string | null) => void;
  clearScore: () => void;
  addRecentTitle: (title: string) => void;
}

export const useScoreStore = create<ScoreState>((set, get) => ({
  score: null,
  isLoading: false,
  importError: null,
  recentTitles: JSON.parse(localStorage.getItem('teachya-recent') ?? '[]'),

  setScore: (score) => set({ score, importError: null, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  setImportError: (importError) => set({ importError, isLoading: false }),

  clearScore: () => set({ score: null }),

  addRecentTitle: (title) => {
    const current = get().recentTitles;
    // Keep only unique, most-recent titles (max 10)
    const updated = [title, ...current.filter((t) => t !== title)].slice(0, 10);
    localStorage.setItem('teachya-recent', JSON.stringify(updated));
    set({ recentTitles: updated });
  },
}));
