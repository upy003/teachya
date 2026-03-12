import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePracticeStore } from '../../stores/practiceStore';
import { Flame, Trophy } from 'lucide-react';

/** Transient visual feedback that pops up on correct/wrong notes */
export function FeedbackOverlay() {
  const { stats, playbackState } = usePracticeStore();
  const [showStreak, setShowStreak] = useState(false);
  const [showFinished, setShowFinished] = useState(false);

  // Show streak milestone celebrations
  useEffect(() => {
    if (stats.currentStreak > 0 && stats.currentStreak % 10 === 0) {
      setShowStreak(true);
      const t = setTimeout(() => setShowStreak(false), 2000);
      return () => clearTimeout(t);
    }
  }, [stats.currentStreak]);

  // Show finished state
  useEffect(() => {
    if (playbackState === 'finished') {
      setShowFinished(true);
    } else {
      setShowFinished(false);
    }
  }, [playbackState]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
      <AnimatePresence>
        {showStreak && (
          <motion.div
            key="streak"
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.2, opacity: 0, y: -20 }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500/90 backdrop-blur-sm shadow-2xl shadow-amber-900/50"
          >
            <Flame size={20} className="text-white" />
            <span className="text-white font-bold text-lg">{stats.currentStreak} in a row!</span>
          </motion.div>
        )}

        {showFinished && (
          <motion.div
            key="finished"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto flex flex-col items-center gap-4 px-8 py-6 rounded-2xl bg-neutral-900/95 border border-white/15 shadow-2xl"
          >
            <Trophy size={40} className="text-amber-400" />
            <h2 className="text-2xl font-bold text-white">Piece Complete!</h2>
            <div className="flex gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-emerald-400">{stats.accuracy}%</div>
                <div className="text-xs text-white/50">Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-400">{stats.bestStreak}</div>
                <div className="text-xs text-white/50">Best Streak</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats.correctNotes}/{stats.totalNotes}</div>
                <div className="text-xs text-white/50">Notes</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
