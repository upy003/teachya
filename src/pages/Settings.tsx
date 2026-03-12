import { useState } from 'react';
import { motion } from 'framer-motion';
import { Usb, Volume2, Eye, Info } from 'lucide-react';
import { DeviceSelector } from '../components/MIDI/DeviceSelector';
import { Slider } from '../components/ui/Slider';
import { usePracticeStore } from '../stores/practiceStore';
import { audioEngine } from '../lib/audio/AudioEngine';
import { useAudio } from '../hooks/useAudio';

/** Settings page: MIDI setup, audio, and display preferences */
export function SettingsPage() {
  const { config, toggleShowNoteNames, toggleGuidanceAudio } = usePracticeStore();
  const { isReady, isLoading, initialize } = useAudio();
  const [volume, setVolume] = useState(80); // 0-100

  const handleVolume = (val: number) => {
    setVolume(val);
    // Convert 0-100 to dB range -40..0
    const db = val === 0 ? -Infinity : -40 + (val / 100) * 40;
    audioEngine.setVolume(db);
  };

  return (
    <div className="flex-1 overflow-auto p-8 max-w-2xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Settings</h1>
        <p className="text-white/40">Configure your practice environment</p>
      </motion.div>

      <div className="space-y-6">
        {/* MIDI Section */}
        <SettingsSection icon={Usb} title="MIDI Devices" desc="Connect your digital piano or keyboard via USB">
          <DeviceSelector />
          <p className="mt-3 text-xs text-white/30 leading-relaxed">
            Compatible with all USB class-compliant MIDI devices. Tested with Yamaha Clavinova (CLP series),
            Roland RD series, Kawai ES/CN series, and more. Hot-plug supported — connect/disconnect at any time.
          </p>
        </SettingsSection>

        {/* Audio Section */}
        <SettingsSection icon={Volume2} title="Audio" desc="Piano sound engine and guidance audio">
          <div className="space-y-4">
            {/* Initialize audio engine button */}
            {!isReady && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Audio Engine</p>
                  <p className="text-xs text-white/40">Click to load piano samples (~10 MB)</p>
                </div>
                <button
                  onClick={initialize}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Initialize'}
                </button>
              </div>
            )}

            {isReady && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 px-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Piano samples loaded
              </div>
            )}

            <Slider
              label="Volume"
              displayValue={`${volume}%`}
              min={0}
              max={100}
              value={volume}
              onChange={(e) => handleVolume(Number(e.target.value))}
            />

            <ToggleRow
              label="Guidance Audio"
              desc="Plays the expected notes to guide your learning"
              value={config.guidanceAudio}
              onChange={toggleGuidanceAudio}
            />
          </div>
        </SettingsSection>

        {/* Display Section */}
        <SettingsSection icon={Eye} title="Display" desc="Visual preferences">
          <div className="space-y-3">
            <ToggleRow
              label="Show Note Names"
              desc="Display note names on piano keys (C4, D4, etc.)"
              value={config.showNoteNames}
              onChange={toggleShowNoteNames}
            />
          </div>
        </SettingsSection>

        {/* About */}
        <SettingsSection icon={Info} title="About TeachYa" desc="">
          <div className="space-y-2 text-sm text-white/50">
            <p>TeachYa is an open-source piano learning app built with React, WebMidi.js, Tone.js, and OpenSheetMusicDisplay.</p>
            <p className="text-xs">
              Supported formats: MusicXML (.xml, .mxl) — exported from MuseScore, Sibelius, Finale, Dorico, and others.
            </p>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

/** Wrapper section card */
function SettingsSection({
  icon: Icon, title, desc, children,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-neutral-900/60 border border-white/8 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
        <div className="w-8 h-8 rounded-lg bg-violet-900/50 flex items-center justify-center">
          <Icon size={16} className="text-violet-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {desc && <p className="text-xs text-white/40">{desc}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

/** A toggle/switch row */
function ToggleRow({
  label, desc, value, onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {desc && <p className="text-xs text-white/40 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
          value ? 'bg-violet-600' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
