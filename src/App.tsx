import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { HomePage } from './pages/Home';
import { PracticePage } from './pages/Practice';
import { SettingsPage } from './pages/Settings';
import { useMIDI } from './hooks/useMIDI';

/** Root component initializing MIDI and providing the app layout */
function AppContent() {
  // Initialize MIDI detection at the top level so it persists across routes
  useMIDI();

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white overflow-hidden">
      <Header />

      {/* Main content area below the fixed header — exact remaining height */}
      <main className="flex flex-col flex-1 pt-16 min-h-0">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

/** App wrapper with Router */
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
