import { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay as OSMD } from 'opensheetmusicdisplay';
import { usePracticeStore } from '../../stores/practiceStore';
import { useScoreStore } from '../../stores/scoreStore';

interface SheetMusicRendererProps {
  showCursor?: boolean;
}

/**
 * Renders MusicXML sheet music using OpenSheetMusicDisplay.
 *
 * Visual design: white paper page with black notes (standard notation),
 * displayed inside a dark "document viewer" background — matching the
 * look of MuseScore, SimplyPiano, etc.
 */
export function SheetMusicRenderer({ showCursor = true }: SheetMusicRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OSMD | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorStepRef = useRef(0);

  const { score } = useScoreStore();
  const { nextNoteIndex, playbackState } = usePracticeStore();

  // --- Initialize OSMD once on mount ---
  useEffect(() => {
    if (!containerRef.current) return;

    const osmd = new OSMD(containerRef.current, {
      autoResize: true,
      backend: 'svg',
      // Standard black-on-white notation — no color overrides
      // OSMD defaults to black notes on white background
      drawingParameters: 'compacttight',
      followCursor: true, // Scroll the view to keep cursor visible
    });

    osmdRef.current = osmd;
    return () => { osmdRef.current = null; };
  }, []);

  // --- Load + render score ---
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
        setError('Failed to render score: ' + String(err));
      });
  }, [score, showCursor]);

  // --- Advance cursor to match nextNoteIndex ---
  useEffect(() => {
    if (!osmdRef.current || !isLoaded || !showCursor) return;
    const cursor = osmdRef.current.cursor;

    if (playbackState === 'idle') {
      cursor.reset();
      cursorStepRef.current = 0;
      return;
    }

    const target = nextNoteIndex;
    const current = cursorStepRef.current;

    if (target > current) {
      for (let i = current; i < target; i++) {
        if (cursor.iterator.EndReached) break;
        cursor.next();
      }
      cursorStepRef.current = target;
    } else if (target < current) {
      cursor.reset();
      cursorStepRef.current = 0;
      for (let i = 0; i < target; i++) {
        if (cursor.iterator.EndReached) break;
        cursor.next();
      }
      cursorStepRef.current = target;
    }
  }, [nextNoteIndex, isLoaded, showCursor, playbackState]);

  return (
    // Outer: dark "document viewer" background (matches the app chrome)
    <div className="relative w-full h-full overflow-auto bg-neutral-800/60">

      {/* Loading */}
      {!isLoaded && !error && score && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3 text-white/50">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Rendering score…</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 p-6">
          <div className="bg-red-950/80 border border-red-500/40 rounded-xl p-5 text-sm text-red-300 max-w-md text-center">
            {error}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!score && (
        <div className="absolute inset-0 flex items-center justify-center text-white/30">
          <p className="text-sm">Import a score to see sheet music</p>
        </div>
      )}

      {/* White paper page — OSMD renders standard black notation here */}
      <div
        className="mx-auto my-6 shadow-2xl shadow-black/60 rounded-sm"
        style={{
          background: '#ffffff',
          // Let OSMD decide the width; constrain to a comfortable reading width
          maxWidth: '900px',
          minHeight: '400px',
        }}
      >
        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
