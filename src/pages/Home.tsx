import { useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileMusic, Music4, ChevronRight, Clock } from 'lucide-react';
import { useScoreStore } from '../stores/scoreStore';
import { parseMusicXML, decompressMxl } from '../lib/musicxml/MusicXMLParser';

/** Home dashboard: drag & drop import and recent pieces list */
export function HomePage() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { score, isLoading, importError, recentTitles, setScore, setLoading, setImportError, addRecentTitle } =
    useScoreStore();

  /** Parse and load a MusicXML file into the store */
  const loadFile = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase().split('.').pop();
      if (!ext || !['xml', 'mxl', 'musicxml'].includes(ext)) {
        setImportError('Unsupported file type. Please import a .xml or .mxl MusicXML file.');
        return;
      }

      setLoading(true);
      try {
        let xmlString: string;

        if (ext === 'mxl') {
          xmlString = await decompressMxl(file);
        } else {
          xmlString = await file.text();
        }

        const parsed = parseMusicXML(xmlString);
        setScore(parsed);
        addRecentTitle(parsed.title);
        navigate('/practice');
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : 'Failed to parse the score file.',
        );
      }
    },
    [setScore, setLoading, setImportError, addRecentTitle, navigate],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  return (
    <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full">
      {/* Hero heading */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-bold text-white mb-2">
          Learn piano,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
            your way
          </span>
        </h1>
        <p className="text-white/50 text-lg">
          Import a MusicXML score and start practicing with real-time MIDI feedback.
        </p>
      </motion.div>

      {/* Import zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-5
            p-12 rounded-2xl border-2 border-dashed cursor-pointer
            transition-all duration-200 group
            ${isDragging
              ? 'border-violet-500 bg-violet-900/20'
              : 'border-white/15 hover:border-violet-500/50 hover:bg-white/3'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.mxl,.musicxml"
            className="hidden"
            onChange={onFileChange}
          />

          {/* Icon */}
          <motion.div
            animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
            className="w-16 h-16 rounded-2xl bg-violet-900/40 border border-violet-500/30 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-7 h-7 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={28} className="text-violet-400 group-hover:scale-110 transition-transform" />
            )}
          </motion.div>

          <div className="text-center">
            <p className="text-white font-semibold mb-1">
              {isDragging ? 'Drop to import' : 'Import your score'}
            </p>
            <p className="text-sm text-white/40">
              Drag & drop or click • Supports .xml and .mxl (MusicXML)
            </p>
            <p className="text-xs text-white/30 mt-1">
              Export from MuseScore: File → Export → MusicXML
            </p>
          </div>
        </div>

        {/* Error message */}
        {importError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm text-red-400 text-center"
          >
            {importError}
          </motion.p>
        )}
      </motion.div>

      {/* Continue with current score */}
      {score && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <h2 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">
            Current Score
          </h2>
          <CurrentScoreCard />
        </motion.div>
      )}

      {/* Recent titles */}
      {recentTitles.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <h2 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">
            Recent
          </h2>
          <div className="flex flex-col gap-2">
            {recentTitles.map((title) => (
              <div
                key={title}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/8"
              >
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <FileMusic size={16} className="text-white/50" />
                </div>
                <span className="flex-1 text-sm text-white/70 truncate">{title}</span>
                <Clock size={14} className="text-white/25" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* How to use */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-10 grid grid-cols-3 gap-4"
      >
        {[
          { icon: FileMusic, title: 'Import Score', desc: 'Export MusicXML from MuseScore, Sibelius, or any notation software' },
          { icon: Music4, title: 'Connect Piano', desc: 'Plug in your digital piano via USB. Yamaha, Roland, Kawai all supported' },
          { icon: Upload, title: 'Start Practicing', desc: 'Follow falling notes or sheet music with real-time note feedback' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="p-4 rounded-xl bg-white/4 border border-white/8">
            <div className="w-9 h-9 rounded-lg bg-violet-900/40 flex items-center justify-center mb-3">
              <Icon size={18} className="text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
            <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** Card showing the currently loaded score with a navigate-to-practice button */
function CurrentScoreCard() {
  const { score } = useScoreStore();
  const navigate = useNavigate();
  if (!score) return null;

  return (
    <button
      onClick={() => navigate('/practice')}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-violet-900/20 border border-violet-500/30 hover:bg-violet-900/30 transition-all group text-left"
    >
      <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/50">
        <Music4 size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{score.title}</p>
        {score.composer && (
          <p className="text-sm text-white/50 truncate">{score.composer}</p>
        )}
        <p className="text-xs text-white/30 mt-0.5">
          {score.measures.length} measures · {Math.round(score.defaultTempo)} BPM
        </p>
      </div>
      <ChevronRight
        size={18}
        className="text-white/30 group-hover:text-violet-400 group-hover:translate-x-1 transition-all shrink-0"
      />
    </button>
  );
}
