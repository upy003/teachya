import { useMIDIStore } from '../../stores/midiStore';
import { midiManager } from '../../lib/midi/MIDIManager';
import { Usb, WifiOff, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

/**
 * Displays connected MIDI devices and allows selecting the active one.
 * Reads from useMIDIStore directly — does NOT call useMIDI() to avoid
 * reinitializing WebMidi.
 */
export function DeviceSelector() {
  const { status, devices, activeDeviceId } = useMIDIStore();

  if (status === 'unavailable') {
    return (
      <div className="flex items-start gap-3 p-4 bg-orange-950/30 border border-orange-500/30 rounded-xl">
        <AlertTriangle size={18} className="text-orange-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-orange-300">Web MIDI Not Supported</p>
          <p className="text-xs text-orange-400/70 mt-1">
            Use Chrome or Edge. Safari and Firefox do not support the Web MIDI API.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-950/30 border border-red-500/30 rounded-xl">
        <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-300">MIDI Permission Denied</p>
          <p className="text-xs text-red-400/70 mt-1">
            Allow MIDI access in your browser site settings, then reload the page.
          </p>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
        <WifiOff size={18} className="text-white/40 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-white/70">No MIDI Devices Found</p>
          <p className="text-xs text-white/40 mt-1">
            Connect a digital piano or keyboard via USB and it will appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {devices.map((device) => (
        <button
          key={device.id}
          onClick={() => midiManager.selectDevice(device.id)}
          className={clsx(
            'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left',
            device.id === activeDeviceId
              ? 'border-violet-500/50 bg-violet-900/20'
              : 'border-white/10 bg-white/5 hover:bg-white/10',
          )}
        >
          <div className={clsx(
            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
            device.id === activeDeviceId ? 'bg-violet-600' : 'bg-white/10',
          )}>
            <Usb size={16} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{device.name}</p>
            {device.manufacturer && (
              <p className="text-xs text-white/40 truncate">{device.manufacturer}</p>
            )}
          </div>

          {device.id === activeDeviceId && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
