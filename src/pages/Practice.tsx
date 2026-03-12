import { usePracticeStore } from '../stores/practiceStore';
import { useScoreStore } from '../stores/scoreStore';
import { FallingNotesCanvas } from '../components/FallingNotes/FallingNotesCanvas';
import { SheetMusicRenderer } from '../components/SheetMusic/SheetMusicRenderer';
import { PianoKeyboard } from '../components/Piano/PianoKeyboard';
import { PracticeControls } from '../components/Practice/PracticeControls';
import { FeedbackOverlay } from '../components/Practice/FeedbackOverlay';
import { usePractice } from '../hooks/usePractice';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

/** Full-screen practice view with dual-mode display and piano keyboard */
export function PracticePage() {
  const { score } = useScoreStore();
  const { config } = usePracticeStore();
  const { playbackState } = usePractice();

  if (!score) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-20 h-20 rounded-2xl bg-violet-900/30 border border-violet-500/20 flex items-center justify-center"
        >
          <Upload size={32} className="text-violet-400" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">No Score Loaded</h2>
          <p className="text-white/50">Import a MusicXML file to start practicing</p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Go to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Score info bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-white/8">
        <Link to="/" className="text-white/50 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white truncate">{score.title}</h1>
          {score.composer && (
            <p className="text-xs text-white/40 truncate">{score.composer}</p>
          )}
        </div>
        <div className="text-xs text-white/30 tabular-nums">
          {Math.round(score.defaultTempo)} BPM
        </div>
      </div>

      {/* Main practice area */}
      <div className="flex-1 relative overflow-hidden">
        <FeedbackOverlay />

        {config.mode === 'falling' ? (
          <FallingNotesCanvas />
        ) : (
          <div className="h-full overflow-auto bg-neutral-950">
            <SheetMusicRenderer showCursor={playbackState !== 'idle'} />
          </div>
        )}
      </div>

      {/* Piano keyboard */}
      <div className="bg-neutral-950 border-t border-white/8">
        <PianoKeyboard
          showNoteNames={config.showNoteNames}
          height={140}
        />
      </div>

      {/* Practice controls */}
      <PracticeControls />
    </div>
  );
}
