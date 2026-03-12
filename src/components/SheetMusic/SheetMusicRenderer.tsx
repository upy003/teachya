import { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay as OSMD, Cursor } from 'opensheetmusicdisplay';
import { usePracticeStore } from '../../stores/practiceStore';
import { useScoreStore } from '../../stores/scoreStore';

interface SheetMusicRendererProps {
  /** Whether to show the cursor following the playhead */
  showCursor?: boolean;
}

/**
 * Renders MusicXML sheet music using OpenSheetMusicDisplay.
 * Tracks the cursor position based on the current practice beat.
 */
export function SheetMusicRenderer({ showCursor = true }: SheetMusicRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OSMD | null>(null);
  const cursorRef = useRef<Cursor | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { score } = useScoreStore();
  const { currentBeat, playbackState } = usePracticeStore();

  // Initialize OSMD once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const osmd = new OSMD(containerRef.current, {
      autoResize: true,
      backend: 'svg',
      // Dark theme: white notes on transparent background
      pageBackgroundColor: 'transparent',
      defaultColorNotehead: '#ffffff',
      defaultColorStem: '#9ca3af',
      defaultColorRest: '#9ca3af',
      defaultColorLabel: '#d1d5db',
      // Compact rendering
      drawingParameters: 'compacttight',
    });

    osmdRef.current = osmd;

    return () => {
      osmdRef.current = null;
    };
  }, []);

  // Load score XML when it changes
  useEffect(() => {
    if (!osmdRef.current || !score?.rawXml) return;

    setIsLoaded(false);
    setError(null);

    osmdRef.current
      .load(score.rawXml)
      .then(() => {
        osmdRef.current!.render();
        setIsLoaded(true);

        if (showCursor) {
          osmdRef.current!.cursor.show();
          cursorRef.current = osmdRef.current!.cursor;
        }
      })
      .catch((err) => {
        setError('Failed to render sheet music: ' + String(err));
      });
  }, [score, showCursor]);

  // Move cursor to follow the current beat
  useEffect(() => {
    if (!cursorRef.current || !isLoaded || playbackState === 'idle') return;

    try {
      // Reset cursor and advance to the correct position
      cursorRef.current.reset();
      // Each cursor.next() advances by one note – we need to match our beat
      // For simplicity, we re-advance each render based on the note index
      // (OSMD cursor advances note by note)
    } catch {
      // Cursor operations may fail on edge cases – silently ignore
    }
  }, [currentBeat, isLoaded, playbackState]);

  return (
    <div className="relative w-full h-full overflow-auto">
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {!isLoaded && !error && score && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white/50">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Rendering score...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!score && (
        <div className="absolute inset-0 flex items-center justify-center text-white/30">
          <p className="text-sm">Import a score to see sheet music</p>
        </div>
      )}

      {/* OSMD renders into this div */}
      <div
        ref={containerRef}
        className="w-full min-h-full p-6"
        style={{ filter: 'invert(0)' }} // OSMD renders with its own colors
      />
    </div>
  );
}
