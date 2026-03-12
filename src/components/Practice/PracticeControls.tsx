import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePracticeStore } from '../../stores/practiceStore';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import clsx from 'clsx';

interface PracticeControlsProps {
  /** Passed from PracticePage (which owns the single usePractice instance) */
  startSession: () => void;
  togglePause: () => void;
  stopSession: () => void;
}

/**
 * Transport controls and practice configuration panel.
 * Does NOT call usePractice() — transport callbacks are passed as props
 * to ensure there is only one game loop in the app.
 */
export function PracticeControls({ startSession, togglePause, stopSession }: PracticeControlsProps) {
  const {
    config,
    playbackState,
    stats,
    setTempo,
    setMode,
    setHandMode,
    setStyle,
    toggleGuidanceAudio,
  } = usePracticeStore();

  const isPlaying = playbackState === 'playing';
  const isActive = playbackState === 'playing' || playbackState === 'paused';

  return (
    <div className="flex flex-col gap-3 p-4 bg-neutral-900/90 border-t border-white/8 backdrop-blur-xl shrink-0">
      {/* Stats row */}
      <div className="flex gap-6 justify-center text-center">
        <StatItem label="Accuracy" value={`${stats.accuracy}%`} highlight={stats.accuracy >= 80} />
        <StatItem label="Streak" value={String(stats.currentStreak)} />
        <StatItem label="Best" value={String(stats.bestStreak)} />
        <StatItem label="Notes" value={`${stats.correctNotes}/${stats.totalNotes}`} />
      </div>

      {/* Main transport controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Stop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={stopSession}
          disabled={!isActive}
          icon={<Square size={16} />}
        />

        {/* Play / Pause — the big round button */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={isActive ? togglePause : startSession}
          className={clsx(
            'w-14 h-14 rounded-full flex items-center justify-center',
            'text-white shadow-2xl transition-colors',
            'bg-violet-600 hover:bg-violet-500 shadow-violet-900/60',
          )}
        >
          {isPlaying
            ? <Pause size={22} />
            : <Play size={22} className="translate-x-0.5" />
          }
        </motion.button>

        {/* Restart */}
        <Button
          variant="ghost"
          size="icon"
          onClick={stopSession}
          icon={<RotateCcw size={16} />}
        />
      </div>

      {/* Configuration row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SegmentControl
          label="Mode"
          options={[
            { value: 'falling', label: 'Falling' },
            { value: 'sheet', label: 'Sheet' },
          ]}
          value={config.mode}
          onChange={(v) => setMode(v as 'falling' | 'sheet')}
        />

        <SegmentControl
          label="Style"
          options={[
            { value: 'stream', label: 'Stream' },
            { value: 'waitForNote', label: 'Wait' },
          ]}
          value={config.style}
          onChange={(v) => setStyle(v as 'waitForNote' | 'stream')}
        />

        <SegmentControl
          label="Hands"
          options={[
            { value: 'both', label: 'Both' },
            { value: 'right', label: 'R' },
            { value: 'left', label: 'L' },
          ]}
          value={config.handMode}
          onChange={(v) => setHandMode(v as 'both' | 'right' | 'left')}
        />

        {/* Guidance audio toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-white/50">Guidance</span>
          <button
            onClick={toggleGuidanceAudio}
            className={clsx(
              'h-9 rounded-lg border text-xs font-medium transition-all',
              config.guidanceAudio
                ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                : 'bg-white/5 border-white/10 text-white/50',
            )}
          >
            {config.guidanceAudio ? 'Audio ON' : 'Audio OFF'}
          </button>
        </div>
      </div>

      {/* Tempo slider */}
      <div className="px-1">
        <Slider
          label="Tempo"
          displayValue={`${Math.round(config.tempoMultiplier * 100)}%`}
          min={25}
          max={200}
          step={5}
          value={config.tempoMultiplier * 100}
          onChange={(e) => setTempo(Number(e.target.value) / 100)}
        />
      </div>
    </div>
  );
}

function StatItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className={clsx('text-lg font-bold font-mono', highlight ? 'text-emerald-400' : 'text-white')}>
        {value}
      </div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}

interface SegmentOption { value: string; label: string; }

function SegmentControl({
  label, options, value, onChange,
}: {
  label: string;
  options: SegmentOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-white/50">{label}</span>
      <div className="flex rounded-lg overflow-hidden border border-white/10 h-9">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'flex-1 text-xs font-medium transition-all',
              value === opt.value
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
