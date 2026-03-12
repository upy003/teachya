# TeachYa – Professional Piano Learning App

A web-based piano learning app similar to Flowkey and SimplyPiano. Import MusicXML scores, connect your digital piano via MIDI, and practice with real-time visual and audio feedback.

![TeachYa Screenshot](docs/screenshot.png)

## Features

- **MusicXML Import** – Drag & drop `.xml` or `.mxl` files exported from MuseScore, Sibelius, Finale, Dorico, or any notation software
- **Dual Practice Modes** – Switch seamlessly between:
  - **Falling Notes** – Colorful notes fall toward a hit zone, Flowkey-style
  - **Sheet Music** – Traditional notation with a moving cursor
- **MIDI Device Support** – Connect any class-compliant digital piano via USB (Yamaha CLP/CSP/P series, Roland RD/FP, Kawai ES/CN, etc.)
- **Real-time Feedback** – Keys glow green (correct) or red (wrong); streak counter and accuracy score
- **Practice Controls**:
  - Wait-for-note mode (pauses until you press the correct key)
  - Stream mode (notes advance at tempo)
  - Tempo adjustment (25%–200%)
  - Hand isolation (left, right, or both)
- **Piano Sound Engine** – Tone.js sampler with realistic grand piano samples
- **Hot-plug MIDI** – Connect/disconnect devices without reloading

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Routing | React Router v6 |
| State | Zustand |
| Sheet Music | OpenSheetMusicDisplay (OSMD) |
| MIDI | WebMidi.js v3 |
| Audio | Tone.js + Salamander Grand Piano samples |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A modern browser with Web MIDI support (Chrome or Edge recommended)
- A USB MIDI piano (optional but recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/teachya.git
cd teachya

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Importing a Score

1. Export your score from **MuseScore**: `File → Export → MusicXML (.mxl)`
2. On the TeachYa home page, drag & drop the `.mxl` or `.xml` file onto the import zone
3. Click **Practice** to begin

### Connecting a MIDI Piano

1. Connect your piano via USB
2. Open **Settings** in TeachYa
3. Your device should appear under **MIDI Devices** automatically
4. Select it and start practicing – notes you play are detected in real time

### Browser Requirements

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| App | ✅ | ✅ | ✅ | ✅ |
| MIDI Support | ✅ | ✅ | ❌ | ❌ |

For MIDI support, use **Chrome** or **Edge**.

## Development

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint
```

## Project Structure

```
src/
├── components/
│   ├── FallingNotes/    # Canvas-based falling note visualizer
│   ├── Layout/          # Header, navigation
│   ├── MIDI/            # Device selector, connection UI
│   ├── Piano/           # 88-key visual keyboard
│   ├── Practice/        # Controls, feedback overlay
│   ├── SheetMusic/      # OSMD sheet music renderer
│   └── ui/              # Reusable UI components
├── hooks/
│   ├── useAudio.ts      # Tone.js audio engine hook
│   ├── useMIDI.ts       # WebMidi.js MIDI hook
│   └── usePractice.ts   # Practice session game loop
├── lib/
│   ├── audio/           # Audio engine singleton
│   ├── musicxml/        # MusicXML parser
│   └── practice/        # Practice engine logic
├── pages/
│   ├── Home.tsx         # Import dashboard
│   ├── Practice.tsx     # Practice view
│   └── Settings.tsx     # MIDI & audio settings
├── stores/              # Zustand state stores
└── types/               # TypeScript type definitions
```

## License

MIT – See [LICENSE](LICENSE) for details.
