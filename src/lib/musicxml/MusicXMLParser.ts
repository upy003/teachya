import type { Score, Measure, Note } from '../../types/Score';

/** Convert a MusicXML step + alter + octave to MIDI note number */
function stepToMidi(step: string, alter: number, octave: number): number {
  const STEPS: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };
  return (octave + 1) * 12 + (STEPS[step] ?? 0) + alter;
}

/** Convert MIDI number to note name like "C4", "F#5" */
function midiToName(midi: number): string {
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return NAMES[midi % 12] + octave;
}

/** Get the duration in quarter-note beats from a MusicXML <type> element */
function getDuration(
  divisionsPerQuarter: number,
  durationDivisions: number
): number {
  return durationDivisions / divisionsPerQuarter;
}

/**
 * Parse a MusicXML string (already decompressed if .mxl) into our Score type.
 * OSMD also handles rendering, so we keep the raw XML for it.
 */
export function parseMusicXML(xmlString: string): Score {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid MusicXML: ' + parseError.textContent);
  }

  // Extract title and composer from metadata
  const workTitle =
    doc.querySelector('work work-title')?.textContent?.trim() ??
    doc.querySelector('movement-title')?.textContent?.trim() ??
    'Untitled';
  const composer =
    doc.querySelector('identification creator[type="composer"]')?.textContent?.trim() ??
    '';

  const measures: Measure[] = [];
  let defaultTempo = 120;
  let totalBeats = 0;
  let currentTimeSigNum = 4;
  let currentTimeSigDen = 4;
  let currentDivisions = 1;
  let currentTempo = 120;

  // Process each part (we treat all notes, staff determined by <staff> element)
  const parts = doc.querySelectorAll('part');

  // Use only the first part for simplicity (covers most piano scores)
  const firstPart = parts[0];
  if (!firstPart) return { title: workTitle, composer, measures: [], defaultTempo, totalBeats: 0, rawXml: xmlString };

  let globalBeatOffset = 0;

  const xmlMeasures = firstPart.querySelectorAll('measure');
  xmlMeasures.forEach((xmlMeasure, _i) => {
    const measureNumber = parseInt(xmlMeasure.getAttribute('number') ?? '1', 10);

    // Update divisions if present
    const divElem = xmlMeasure.querySelector('attributes > divisions');
    if (divElem) currentDivisions = parseInt(divElem.textContent ?? '1', 10);

    // Update time signature if present
    const beats = xmlMeasure.querySelector('attributes > time > beats');
    const beatType = xmlMeasure.querySelector('attributes > time > beat-type');
    if (beats) currentTimeSigNum = parseInt(beats.textContent ?? '4', 10);
    if (beatType) currentTimeSigDen = parseInt(beatType.textContent ?? '4', 10);

    // Update tempo if there's a sound element
    const soundElem = xmlMeasure.querySelector('direction > sound[tempo]');
    if (soundElem) {
      const t = parseFloat(soundElem.getAttribute('tempo') ?? '120');
      if (!isNaN(t) && t > 0) {
        currentTempo = t;
        if (globalBeatOffset === 0) defaultTempo = t;
      }
    }

    const notes: Note[] = [];
    // Track per-voice beat position within the measure
    const voicePositions: Record<string, number> = {};

    const noteElems = xmlMeasure.querySelectorAll('note');
    noteElems.forEach((noteElem) => {
      const isRest = !!noteElem.querySelector('rest');
      const isChord = !!noteElem.querySelector('chord');
      const durationDivs = parseInt(
        noteElem.querySelector('duration')?.textContent ?? '1', 10
      );
      const staff = parseInt(noteElem.querySelector('staff')?.textContent ?? '1', 10) as 1 | 2;
      const voice = parseInt(noteElem.querySelector('voice')?.textContent ?? '1', 10);
      const voiceKey = `${staff}-${voice}`;
      const isTied = !!noteElem.querySelector('tie[type="stop"]');

      // Chord notes share the start time of the previous note in the same voice
      if (!voicePositions[voiceKey]) voicePositions[voiceKey] = 0;
      if (!isChord) {
        // not a chord continuation – normal advance
      }
      const beatDuration = getDuration(currentDivisions, durationDivs);
      const startTime = globalBeatOffset + voicePositions[voiceKey];

      let midi: number | null = null;
      let name: string | null = null;

      if (!isRest) {
        const step = noteElem.querySelector('pitch > step')?.textContent ?? 'C';
        const alter = parseFloat(noteElem.querySelector('pitch > alter')?.textContent ?? '0');
        const octave = parseInt(noteElem.querySelector('pitch > octave')?.textContent ?? '4', 10);
        midi = stepToMidi(step, alter, octave);
        name = midiToName(midi);
      }

      const fingerElem = noteElem.querySelector('notations > technical > fingering');
      const finger = fingerElem
        ? parseInt(fingerElem.textContent ?? '0', 10) || undefined
        : undefined;

      notes.push({
        midi,
        name,
        duration: beatDuration,
        startTime,
        staff: (staff === 2 ? 2 : 1) as 1 | 2,
        voice,
        isRest,
        isTied,
        finger,
      });

      // Advance position only for non-chord notes
      if (!isChord) {
        voicePositions[voiceKey] = (voicePositions[voiceKey] ?? 0) + beatDuration;
      }
    });

    // Measure duration = numerator of time sig in quarter-note beats
    const measureBeats =
      currentTimeSigNum * (4 / currentTimeSigDen);
    globalBeatOffset += measureBeats;
    totalBeats += measureBeats;

    measures.push({
      number: measureNumber,
      notes,
      timeSigNumerator: currentTimeSigNum,
      timeSigDenominator: currentTimeSigDen,
      tempo: currentTempo,
    });
  });

  return {
    title: workTitle,
    composer,
    measures,
    defaultTempo,
    totalBeats,
    rawXml: xmlString,
  };
}

/**
 * Decompress a .mxl (MusicXML zip) file and return the inner XML string.
 * Uses the browser's DecompressionStream API.
 */
export async function decompressMxl(file: File): Promise<string> {
  // .mxl is a ZIP file – use JSZip-like approach via browser's native zip
  // Since we don't have JSZip, we try to use the native File System APIs
  // For broad compatibility, we'll use a dynamic import of JSZip
  try {
    // Dynamic import of jszip (added as optional dep)
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);
    // Find the main MusicXML file (listed in META-INF/container.xml or first .xml)
    let xmlContent: string | null = null;

    // Try to read container.xml first
    const container = zip.file('META-INF/container.xml');
    if (container) {
      const containerXml = await container.async('text');
      const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
      const rootFilePath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
      if (rootFilePath) {
        const rootFile = zip.file(rootFilePath);
        if (rootFile) xmlContent = await rootFile.async('text');
      }
    }

    // Fallback: find first .xml file that isn't in META-INF
    if (!xmlContent) {
      for (const [name, zipObj] of Object.entries(zip.files)) {
        if (name.endsWith('.xml') && !name.startsWith('META-INF')) {
          xmlContent = await zipObj.async('text');
          break;
        }
      }
    }

    if (!xmlContent) throw new Error('No MusicXML found in .mxl archive');
    return xmlContent;
  } catch {
    throw new Error('Could not decompress .mxl file. Make sure jszip is installed.');
  }
}
