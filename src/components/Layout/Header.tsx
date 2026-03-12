import { Link, useLocation } from 'react-router-dom';
import { Music4, Settings, Home, Piano } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useMIDIStore } from '../../stores/midiStore';

/** Top navigation bar with MIDI status indicator */
export function Header() {
  const location = useLocation();
  const { status } = useMIDIStore();

  const navItems = [
    { to: '/', label: 'Library', icon: Home },
    { to: '/practice', label: 'Practice', icon: Piano },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-16 flex items-center px-6 gap-6 bg-neutral-950/80 backdrop-blur-xl border-b border-white/8">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mr-4">
        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
          <Music4 size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Teach<span className="text-violet-400">Ya</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={clsx(
                'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active ? 'text-white' : 'text-white/50 hover:text-white/80',
              )}
            >
              <Icon size={16} />
              {label}
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-lg bg-white/10 -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* MIDI Status */}
      <MIDIStatusBadge status={status} />
    </header>
  );
}

/** Small badge showing MIDI connection status */
function MIDIStatusBadge({ status }: { status: string }) {
  const configs = {
    connected: { color: 'bg-emerald-500', label: 'MIDI Connected' },
    disconnected: { color: 'bg-white/20', label: 'No MIDI' },
    unavailable: { color: 'bg-orange-500', label: 'MIDI N/A' },
    denied: { color: 'bg-red-500', label: 'MIDI Denied' },
  } as const;

  const cfg = configs[status as keyof typeof configs] ?? configs.disconnected;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/10">
      <span className={clsx('w-2 h-2 rounded-full', cfg.color,
        status === 'connected' && 'animate-pulse'
      )} />
      <span className="text-xs text-white/60">{cfg.label}</span>
    </div>
  );
}
