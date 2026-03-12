import { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay as OSMD } from 'opensheetmusicdisplay';
import { usePracticeStore } from '../../stores/practiceStore';
import { useScoreStore } from '../../stores/scoreStore';

interface SheetMusicRendererProps {
  /** Show the cursor arrow following the playhead */
  showCursor?: boolean;
}

/**
 * Renders MusicXML sheet music using OpenSheetMusicDisplay.
 * Tracks the OSMD cursor position based on nextNoteIndex from the practice store.
 */
export function SheetMusicRenderer({ showCursor = true }: SheetMusicRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OSMD | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track how far the cursor has been advanced (in OSMD cursor steps)
  const cursorStepRef = useRef(0);

  const { score } = useScoreStore();
  const { nextNoteIndex, playbackState } = usePracticeStore();

  // --- Initialize OSMD once on mount ---
  useEffect(() => {
    if (!containerRef.current) return;

    const osmd = new OSMD(containerRef.current, {
      autoResize: true,
      backend: 'svg',
      // Dark-mode friendly colors
      pageBackgroundColor: 'transparent',
      defaultColorNotehead: '#e8e8f0',
      defaultColorStem: '#9ca3af',
      defaultColorRest: '#9ca3af',
      defaultColorLabel: '#d1d5db',
      drawingParameters: 'compacttight',
    });

    osmdRef.current = osmd;

    return () => {
      osmdRef.current = null;
    };
  }, []);

  // --- Load score when it changes ---
  useEffect(() => {
    if (!osmdRef.current || !score?.rawXml) return;

    setIsLoaded(false);
    setError(null);
    cursorStepRef.current = 0;

    osmdRef.current
      .load(score.rawXml)
      .then(() => {
        if (!osmdRef.current) return;
        osmdRef.current.render();
        setIsLoaded(true);

        if (showCursor) {
          osmdRef.current.cursor.reset();
          osmdRef.current.cursor.show();
        }
      })
      .catch((err: unknown) => {
        setError('Failed to render sheet music: ' + String(err));
      });
  }, [score, showCursor]);

  // --- Advance the OSMD cursor to match nextNoteIndex ---
  useEffect(() => {
    if (!osmdRef.current || !isLoaded || !showCursor) return;

    const cursor = osmdRef.current.cursor;

    if (playbackState === 'idle') {
      // Reset cursor to beginning when session stops
      cursor.reset();
      cursorStepRef.current = 0;
      return;
    }

    // Advance the cursor forward to match the current note index.
    // OSMD cursor steps one note at a time via cursor.next().
    const targetStep = nextNoteIndex;
    const currentStep = cursorStepRef.current;

    if (targetStep > currentStep) {
      // Advance cursor forward
      for (let i = currentStep; i < targetStep; i++) {
        if (cursor.iterator.EndReached) break;
        cursor.next();
      }
      cursorStepRef.current = targetStep;
    } else if (targetStep < currentStep) {
      // Went backward (e.g., after stop+restart): reset and re-advance
      cursor.reset();
      cursorStepRef.current = 0;
      for (let i = 0; i < targetStep; i++) {
        if (cursor.iterator.EndReached) break;
        cursor.next();
      }
      cursorStepRef.current = targetStep;
    }
  }, [nextNoteIndex, isLoaded, showCursor, playbackState]);

  return (
    <div className="relative w-full h-full overflow-auto">
      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-5 text-sm text-red-300 max-w-md text-center">
            {error}
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {!isLoaded && !error && score && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white/40">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Rendering score…</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!score && (
        <div className="absolute inset-0 flex items-center justify-center text-white/30">
          <p className="text-sm">Import a score to see sheet music</p>
        </div>
      )}

      {/* OSMD renders into this container */}
      <div
        ref={containerRef}
        className="w-full min-h-full p-4"
      />
    </div>
  );
}
