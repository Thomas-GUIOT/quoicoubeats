import * as path from "node:path";
import { extractDestinationAndName } from "./cli-util.js";
import {
  QuoicouBeats,
  Track,
  ClassicNote,
  isClassicNote,
  DrumNote,
  isDrumNote,
  isPatternReference,
  isTimeSignatureChange,
  TimeSignatureChange,
} from "../language/generated/ast.js";
import MidiWriter from "midi-writer-js";
import * as fs from "fs";

import instruments from "../instruments.json" assert { type: "json" };
import keyboard_instruments from "../keyboard_instruments.json" assert { type: "json" };
import * as util from "util";

const MIDI_ON_Stack: StackNote[] = [];
const MIDI_OFF_Stack: StackNote[] = [];

type StackNote = {
  tickMark: number;
  note: any;
};

/**
 * Return the pitch for a note according to its octave using the MIDI standard (60 for C4)
 * @param note
 */
function noteToPitch(note: any): string {
  const octave = note.octave + 1;
  switch (note.note) {
    case "Do":
    case "C":
      return (octave * 12).toString();
    case "Do#":
    case "C#":
      return (1 + octave * 12).toString();
    case "Re":
    case "D":
      return (2 + octave * 12).toString();
    case "Re#":
    case "D#":
      return (3 + octave * 12).toString();
    case "Mi":
    case "E":
      return (4 + octave * 12).toString();
    case "Fa":
    case "F":
      return (5 + octave * 12).toString();
    case "Fa#":
    case "F#":
      return (6 + octave * 12).toString();
    case "Sol":
    case "G":
      return (7 + octave * 12).toString();
    case "Sol#":
    case "G#":
      return (8 + octave * 12).toString();
    case "La":
    case "A":
      return (9 + octave * 12).toString();
    case "La#":
    case "A#":
      return (10 + octave * 12).toString();
    case "Si":
    case "B":
      return (11 + octave * 12).toString();
    default:
      throw new Error(`Note inconnue: ${note.note}`);
  }
}

function getDrumInstrument(note: string): number {
  switch (note) {
    case "kd":
    case "bd":
      return 35;
    case "sd":
      return 38;
    case "hh":
    case "ch":
      return 42;
    case "oh":
      return 46;
    case "rc":
      return 53;
    case "cc":
      return 49;
    default:
      return 38;
  }
}

function noteTypeToTicks(noteType: string, ticks: number): number {
  if (!noteType) return 0;
  const noteTypeToTicks: any = {
    ronde: 4 * ticks,
    blanche: 2 * ticks,
    noire: ticks,
    croche: 0.5 * ticks,
    doubleCroche: 0.25 * ticks,
    tripleCroche: 0.125 * ticks,
    quadrupleCroche: 0.0625 * ticks,
    drum: 1,
    accord: 0,
  };
  if (noteTypeToTicks[noteType] !== undefined) return noteTypeToTicks[noteType];
  else throw new Error(`Type de note inconnu: ${noteType}`);
}

function fillStacks(
  notes: (ClassicNote | DrumNote | TimeSignatureChange)[],
  tickCount: number
) {
  let previousNoteMarks = {
    start: 0,
    end: 0,
  };

  notes.forEach((note) => {
    console.log(`note.type: ${note.$type}`);
    let noteType;
    if (isDrumNote(note)) noteType = "drum";
    else if (isClassicNote(note)) noteType = note.noteType;
    if (isClassicNote(note) || isDrumNote(note)) {
      const endTickMark = noteTypeToTicks(noteType ?? "ronde", tickCount);
      const noteDelay = note.delay
        .flatMap((delay) => delay)
        .reduce((a, b) => a + noteTypeToTicks(b, tickCount), 0);
      const notePause = note.pause
        .flatMap((pause) => pause)
        .reduce((a, b) => a + noteTypeToTicks(b, tickCount), 0);
      const noteStart = note.delay.length
        ? previousNoteMarks.start + noteDelay
        : previousNoteMarks.end + notePause;
      const noteEnd = noteStart + endTickMark;
      console.log(
        `noteDelay: ${noteDelay} notePause: ${notePause} noteStart: ${noteStart} noteEnd: ${noteEnd}`
      );
      // console.log(`note: ${note.note} noteDelay: ${noteDelay} notePause: ${notePause} noteStart: ${noteStart} noteEnd: ${noteEnd}`)
      MIDI_ON_Stack.push({
        tickMark: noteStart,
        note: note,
      });
      MIDI_OFF_Stack.push({
        tickMark: noteEnd,
        note: note,
      });
      previousNoteMarks = {
        start: noteStart,
        end: noteEnd,
      };
    } else if (isTimeSignatureChange(note)) {
      console.log(
        `ADD time signature change: ${note.numerator}/${note.denominator}`
      );
      MIDI_ON_Stack.push({
        tickMark: previousNoteMarks.end,
        note: note,
      });
    }
  });
  MIDI_ON_Stack.sort((a, b) => {
    if (a.tickMark === b.tickMark) {
      if (a.note.pause.length) return 1;
      if (a.note.delay[0] === "accord") return -1;
      else return -1;
    } else return b.tickMark - a.tickMark;
  });
  MIDI_OFF_Stack.sort((a, b) => {
    if (a.tickMark === b.tickMark) {
      if (a.note.pause.length) return 1;
      if (a.note.delay[0] === "accord") return -1;
      else return -1;
    } else return b.tickMark - a.tickMark;
  });

  // print both stacks
  console.log("------STACKS------");
  console.log("MIDI_ON_Stack:");
  MIDI_ON_Stack.forEach((note) =>
    console.log(`note: ${note.note.note} tickMark: ${note.tickMark}`)
  );
  console.log("MIDI_OFF_Stack:");
  MIDI_OFF_Stack.forEach((note) =>
    console.log(`note: ${note.note.note} tickMark: ${note.tickMark}`)
  );
  console.log("------------------");
}

function addOnEvent(track: MidiWriter.Track, note: ClassicNote, ticks: number) {
  const noteOptions: any = {
    pitch: [noteToPitch(note)],
    velocity: 100,
  };
  let delay = note.delay
    .flatMap((delay: string) => delay)
    .reduce((a: number, b: string) => a + noteTypeToTicks(b, ticks), 0);
  const pause = note.pause
    .map((pause: string) => pause)
    .reduce((a: number, b: string) => a + noteTypeToTicks(b, ticks), 0);
  delay += pause;
  if (delay > 0) noteOptions.wait = `t${delay}`;
  console.log(
    `> ON note: ${note.note} options: ${JSON.stringify(noteOptions)}`
  );
  track.addEvent(
    new MidiWriter.NoteOnEvent({
      ...noteOptions,
      channel: isClassicNote(note) ? 1 : 10,
    })
  );
}

function addDrumEvent(
  track: MidiWriter.Track,
  note: DrumNote[],
  ticks: number
) {
  let pitch = note.map((note) => getDrumInstrument(note.element));
  const noteOptions: any = {
    pitch: pitch,
    velocity: 100,
    duration: "t1",
    channel: 10,
  };
  let pause = note[0].pause
    .map((pause) => pause)
    .reduce((a, b) => a + noteTypeToTicks(b, ticks), 0);
  if (pause > 0) noteOptions.wait = `t${pause - 1}`;
  console.log(
    `> DRUM : ${
      isDrumNote(note) ? note.element : note.flatMap((note) => note.element)
    } options: ${JSON.stringify(noteOptions)}`
  );
  track.addEvent(
    new MidiWriter.NoteEvent({
      ...noteOptions,
    })
  );
}

function addOffEvent(
  track: MidiWriter.Track,
  note: ClassicNote,
  ticks: number,
  delta: number | undefined = undefined
) {
  // const delayValue = note.delay.flatMap((delay: string) => delay).reduce((a: number, b: string) => a + noteTypeToTicks(b, ticks), 0);
  // console.log(`note: ${note.note} delay: ${note.delay}`)
  const isAccord = note.delay[0] === "accord";
  // console.log(`isAccord: ${isAccord}`)
  const duration = delta
    ? 0
    : isAccord
    ? 0
    : noteTypeToTicks(note.noteType!, ticks);
  // console.log(`duration: ${duration}`)
  // console.log(`delta: ${delta}`)
  const noteOptions: any = {
    pitch: [noteToPitch(note)],
    duration: `t${duration}`,
  };
  if (delta) noteOptions.delta = delta;
  console.log(
    `> OFF note: ${note.note} options: ${JSON.stringify(noteOptions)}`
  );
  track.addEvent(
    new MidiWriter.NoteOffEvent({
      ...noteOptions,
      channel: isClassicNote(note) ? 1 : 10,
    })
  );
}

function generateMidiEvents(trackMidi: MidiWriter.Track, ticks: number) {
  // Add midi events with the correct order until both stack are empty
  let note = null;
  let previousEvents: any = {
    on: { tickMark: 0, note: null },
    off: { tickMark: 0, note: null },
  };
  while (MIDI_ON_Stack.length > 0 || MIDI_OFF_Stack.length > 0) {
    // Compare the top of the stack and take the one with the smallest tickMark
    // then add the event to the track using addOnEvent or addOffEvent accordingly
    let on = MIDI_ON_Stack[MIDI_ON_Stack.length - 1];
    let off = MIDI_OFF_Stack[MIDI_OFF_Stack.length - 1];
    // console.log('INSPECT: ', util.inspect(on))
    // console.log(`on: ${JSON.stringify(on?.note.note)} off: ${JSON.stringify(off?.note.note)}`)
    // console.log(`on: ${on?.tickMark} off: ${off?.tickMark}`)
    if (on?.tickMark < off?.tickMark) {
      // console.log('on < off')
      note = MIDI_ON_Stack.pop();
      // console.log(`on: ${JSON.stringify(note.note) + note.noteType}`)
      if (isTimeSignatureChange(note?.note)) {
        console.log(
          `time signature change: ${note?.note.numerator}/${note?.note.denominator}`
        );
        trackMidi.addEvent(
          new MidiWriter.TimeSignatureEvent(
            note?.note.numerator!,
            note?.note.denominator!,
            24,
            8
          )
        );
      } else {
        console.log(`TRYING TO ADD: ${util.inspect(on)}}`);
        addOnEvent(trackMidi, note?.note, ticks);
        previousEvents.on = on;
      }
    } else if (on?.tickMark === off?.tickMark || off) {
      // console.log('on > off')
      note = MIDI_OFF_Stack.pop();
      if (!note) break;
      // console.log(`off: ${JSON.stringify(note.note) + note.noteType}`)
      // console.log(`inspect: ${util.inspect(off)}}`)
      const previousOffEnd = previousEvents.on?.tickMark;
      const previousOffStart = previousEvents.off?.tickMark;
      const mostRecentEvent =
        previousOffEnd > previousOffStart ? previousOffEnd : previousOffStart;
      console.log(`mostRecentEvent: ${mostRecentEvent}`);
      console.log(`note.tickMark: ${note.tickMark}`);
      let delta = note.tickMark - mostRecentEvent;
      console.log(`delta: ${delta}`);
      if (delta >= 0) addOffEvent(trackMidi, note.note, ticks, delta);
      else addOffEvent(trackMidi, note.note, ticks);
      previousEvents.off = off;
    }
  }
}

function replaceDefaultValue(
  defaultOctave: number,
  defaultNoteType: string,
  note: ClassicNote
) {
  if (note.octave === undefined) {
    note.octave = defaultOctave;
  }
  if (note.noteType === undefined || note.noteType === "") {
    note.noteType = defaultNoteType;
  }
}

export function generateKeyboardProgram(
  model: QuoicouBeats,
  filePath: string,
  destination: string | undefined,
  audioPath: string
): string | null {
  if (!model.keyboard) {
    return null;
  }
  const data = extractDestinationAndName(filePath, destination);
  const generatedFilePath = `${path.join(data.destination, data.name)}-wk.html`;

  const tickCount = model.music.tickCount;

  const midiAudioPath = path.join("..", audioPath);
  const keyboardBindingConfig = model.keyboard?.bindingConf;
  const instrumentName = keyboardBindingConfig?.instrument.instrument;
  const instrumentNumber =
    Object.entries(keyboard_instruments).find(
      ([key, _]) => key === instrumentName
    )?.[1] ?? 0;
  const musicName = model.music.name;

  const assetsFolder = path.join(
    "assets",
    "instruments",
    instrumentNumber.toString()
  );
  const instrumentImage = path.join(assetsFolder, "image.png");

  let htmlWriter = `<!DOCTYPE html><html><head><title>${instrumentName} - QuoicouBeats</title>
  <style>body {font-family: monospace;font-size: 1.5rem;text-align: center; }h1 {font-size: 3rem;}#instrument_image { width: 40px;}#btns{display: none;}
  #log-container {background-color: beige;border: black solid 1px;padding: 0 10px;margin: 10px;position: fixed;bottom: 10px;right: 10px;max-height: 50vh;overflow: scroll;} #rec-text { font-size: 1rem; }
  #rec-logo { width: 10px; height: 10px; border-radius: 5px; background: red; margin-right: 5px; } #rec {display: none; left: 30px; top: 30px; position: fixed; align-items: center;
  animation-duration: .8s; animation-name: clignoter; animation-iteration-count: infinite;} @keyframes clignoter { 0%   { opacity:1; } 40%   {opacity:0; } 100% { opacity:1; }}</style>
  <script src="https://cdn.jsdelivr.net/combine/npm/tone@14.7.58,npm/@magenta/music@1.23.1/es6/core.js,npm/focus-visible@5,npm/html-midi-player@1.5.0"></script>
  </head><body><div id="rec"><div id="rec-logo"></div><div id="rec-text">Logging...</div></div><h1>Play - ${musicName}</h1><midi-player sound-font visualizer="#myPianoRollVisualizer" src="${midiAudioPath}"></midi-player>
  <midi-visualizer type="piano-roll" id="myPianoRollVisualizer" src="${midiAudioPath}"></midi-visualizer>
  <h1>Instrument - ${instrumentName} <img id="instrument_image" src="${instrumentImage}" alt="${instrumentName}"/></h1><h3>Binding :</h3>`;

  keyboardBindingConfig?.bindings.forEach((binding) => {
    const keyToLowerCase = binding.key.toLowerCase();
    const note =
      binding.note.$type === DrumNote
        ? binding.note.element
        : binding.note.note;
    const notePath = path.join(assetsFolder, note + ".mp3");

    htmlWriter += `<p>${keyToLowerCase}: ${note}</p><audio src="${notePath}" id="${keyToLowerCase}" note="${note}"></audio>`;
  });

  htmlWriter += `<div id="log-container"><div id="btns"><button onclick="copyToClipboard()" type="button">Copy in QB language</button>
  <button onclick="reset()" type="button">Reset</button></div><p id="log"></p></div>`;

  htmlWriter += `<script>
    let firstDate = null;
    const log = document.getElementById("log");
    const rec = document.getElementById("rec");
    const btns = document.getElementById("btns");
    let notes = [];

    document.addEventListener('keydown', e => {
        if (e.repeat) return
        playNote(e.key);
    })

    let playNote = (key) => {
        const noteSound = document.getElementById(key)
        if(!noteSound) return;
        if (firstDate == null) {
            rec.style.display = "flex";
            firstDate = new Date().getTime();
            btns.style.display = "block";
        }
        const currentMinute = (new Date().getTime() - firstDate) / 60000;
        const tick = Math.round((${tickCount} * currentMinute) * 10) / 10;
        log.innerText += noteSound.attributes.note.value + " played at tick n°" + tick + "\\n";
        notes.push({note: noteSound.attributes.note.value, tick: tick});
        noteSound.currentTime = 0;
        noteSound.play();
    }

    let copyToClipboard = () => {
        let clipboard = "Track \\"My Music\\" {\\n\\tInstrument \\"${instrumentName}\\"\\n\tNotes {\\n"
        for (let i = 0; i < notes.length; i++) {
            const noteObject = notes[i];
            const previousNoteTick = notes[i - 1]?.tick ?? 0;
            const delay = convertDelay((Math.round((noteObject.tick - previousNoteTick)*10)/10));
            clipboard += "\\t\\t" + noteObject.note + (delay ? " [" + delay + "]\\n" : "\\n");
        }
        clipboard += "\\t}\\n}";
        navigator.clipboard.writeText(clipboard);
    }

    let reset = () => {
        log.innerText = "";
        notes = [];
        firstDate = null;
        rec.style.display = "none";
        btns.style.display = "none";
    }

    const noteTypes = {
        ronde: 4,
        blanche: 2,
        noire: 1,
        croche: 0.5,
        doubleCroche: 0.25,
        tripleCroche: 0.125,
        quadrupleCroche: 0.0625,
    };

    let convertDelay = (tick) => {
        const result = [];
        for (const noteType in noteTypes) {
          const noteValue = noteTypes[noteType];
          while (tick >= noteValue) {
            result.push(noteType);
            tick -= noteValue;
          }
        }
        return result.join("");
      }
    </script></body></html>`;

  fs.writeFileSync(generatedFilePath, htmlWriter, "utf-8");

  return generatedFilePath;
}

function highlightKeywords(code: string): string {
  const keywords = ['Music', 'Tempo', 'TimeSignature', 'Ticks', 
  'Tracks', 'Track', 'Instrument', 'Notes', 'DefaultOctave', 'DefaultNoteType', 'KeyboardBinding'];

  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    code = code.replace(regex, `<span class="keyword">${keyword}</span>`);
  });

  return code;
}


export function generateMidiPlayerAndVizualizer(
  model: QuoicouBeats,
  filePath: string,
  destination: string | undefined,
  audioPath: string
): string | null {
  const data = extractDestinationAndName(filePath, destination);
  const generatedFilePath = `${path.join(data.destination, data.name)}-midi-vizualizer.html`;

  const midiAudioPath = path.join("..", audioPath);

  const musicName = model.music.name;

  let htmlWriter = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MIDI Player & Vizualizer</title><style>.title {text-align: center;}#all-container {display: flex;justify-content: center;}body {font-family: 'Courier New', monospace;background-color: #f4f4f4;margin: 2;height: 100vh;}.code-container {border: 1px solid #ccc;border-radius: 5px;overflow: auto;padding: 20px;background-color: #fff;box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);max-width: 600px;width: 100%;}code {display: block;white-space: pre-wrap;}.keyword {color: blue;/* Couleur pour les mots clés */font-weight: bold;}.comment {color: green;/* Couleur pour les commentaires */font-style: italic;}.player_part {border: 1px solid #ccc;border-radius: 5px;margin-left: 10px;overflow: auto;padding: 20px;background-color: #fff;box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);max-width: 600px;width: 100%;padding: 10px;display: flex;flex-direction: column;align-items: center;}</style>
  <script src="https://cdn.jsdelivr.net/combine/npm/tone@14.7.58,npm/@magenta/music@1.23.1/es6/core.js,npm/focus-visible@5,npm/html-midi-player@1.5.0"></script></head><body>
  <h1 class="title">MIDI Player & Vizualizer for ${musicName}</h1><div id="all-container"><div class="code-container"><code></code></div><div class="player_part"><midi-player loop sound-font visualizer="#myPianoRollVisualizer" src="${midiAudioPath}"></midi-player>
  <midi-visualizer type="piano-roll" id="myPianoRollVisualizer" src="${midiAudioPath}"></midi-visualizer></div></div></body>
  </html>`;

  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const highlightedCode = highlightKeywords(fileContent);

  const htmlCodeContent = `<code>${highlightedCode}</code>`;
  htmlWriter = htmlWriter.replace('<code></code>', htmlCodeContent);

  fs.writeFileSync(generatedFilePath, htmlWriter, "utf-8");

  return generatedFilePath;
}

function generateDrumsEvents(
  trackMidi: MidiWriter.Track,
  drumNotes: (DrumNote[] | TimeSignatureChange)[],
  ticks: number
) {
  drumNotes.forEach((note) => {
    if (isTimeSignatureChange(note)) {
      console.log(
        `time signature change: ${note.numerator}/${note.denominator}`
      );
      trackMidi.addEvent(
        new MidiWriter.TimeSignatureEvent(
          note.numerator,
          note.denominator,
          24,
          8
        )
      );
      return;
    }
    addDrumEvent(trackMidi, note, ticks);
  });
}

export function generateJavaScript(
  model: QuoicouBeats,
  filePath: string,
  destination: string | undefined
): string {
  const data = extractDestinationAndName(filePath, destination);
  const generatedFilePath = `${path.join(data.destination, data.name)}.mid`;

  const numerator = model.music.numerator;
  const denominator = model.music.denominator;
  console.log(`numerator: ${numerator} denominator: ${denominator}`);

  const tickCount = model.music.tickCount;

  // If default values are needed, their presence is checked in the validator
  // The other value is only used to ensure that the value is not null
  const defaultOctave = model.music.defaultOctave || 5;
  const defaultNoteType = model.music.defaultNoteType || "noire";

  model.music.patterns.forEach((pattern) => {
    pattern.notes.forEach((note) => {
      if (isClassicNote(note)) {
        replaceDefaultValue(defaultOctave, defaultNoteType, note);
      }
    });
  });

  let midiTracks: MidiWriter.Track[] = [];
  // let silence : number = 0;
  // let channel : number = 1;
  model.music.tracks.forEach((track: Track) => {
    const trackMidi = new MidiWriter.Track();
    const instrumentNumber =
      Object.entries(instruments).find(
        ([key, _]) => key === track.instrument.instrument
      )?.[1] ?? 0;
    trackMidi.addEvent(
      new MidiWriter.TimeSignatureEvent(numerator, denominator, 24, 8)
    );
    // trackMidi.addInstrumentName(track.name);
    trackMidi.setTempo(model.music.tempo);

    if (track.instrument.instrument === "Drums") {
      // Drums
      let drumNotes = track.notes.filter(
        (note) => isDrumNote(note) || isTimeSignatureChange(note)
      ) as (DrumNote | TimeSignatureChange)[];
      let newDrumNotes: (DrumNote[] | TimeSignatureChange)[] = [];
      drumNotes.forEach((note) => {
        if (isTimeSignatureChange(note)) {
          newDrumNotes.push(note);
          return;
        }
        console.log(`note: ${note.element} delay: ${note.delay}`);
        if (note.delay[0] === "accord") {
          (newDrumNotes[newDrumNotes.length - 1] as DrumNote[]).push(note);
        } else {
          newDrumNotes.push([note]);
        }
      });
      generateDrumsEvents(trackMidi, newDrumNotes, tickCount);
    } else {
      trackMidi.addEvent(
        new MidiWriter.ProgramChangeEvent({ instrument: instrumentNumber })
      );
      // Other instruments with classical notes (ensured by the validator)
      let notes: (ClassicNote | TimeSignatureChange)[] = [];
      track.notes.forEach((patternOrNote) => {
        if (isClassicNote(patternOrNote)) {
          replaceDefaultValue(defaultOctave, defaultNoteType, patternOrNote);
          notes.push(patternOrNote);
        } else if (isPatternReference(patternOrNote)) {
          // On repète le pattern autant de fois que demandé
          const repeatCount = patternOrNote.repeatCount
            ? patternOrNote.repeatCount
            : 1;
          for (let i = 0; i < repeatCount; i++) {
            patternOrNote.pattern.ref?.notes.forEach((note) => {
              // Check for compilation but this should never happen thanks to the validator
              if (isClassicNote(note)) {
                notes.push(note);
              }
            });
          }
        } else if (isTimeSignatureChange(patternOrNote)) {
          notes.push(patternOrNote);
        }
      });

      fillStacks(notes, tickCount);
      generateMidiEvents(trackMidi, tickCount);
    }
    midiTracks.push(trackMidi);
  });

  // const notes = track.notesOrPatterns.flatMap(noteOrPattern => {
  //     if (isNote(noteOrPattern)) {
  //         return noteOrPattern;
  //     } if (isDrumNote(noteOrPattern)) {
  //         return noteOrPattern;
  //     }
  //     else {
  //         const pattern = music.patterns.find(pattern => pattern.name === noteOrPattern.pattern.ref?.name);
  //         if (pattern) {
  //             let patternNotes: any[] = [];
  //             let repeatCount = 1;
  //             if (noteOrPattern.repeatCount != null) {
  //                 repeatCount = parseInt(noteOrPattern.repeatCount);
  //             }
  //             for (let i = 0; i < repeatCount; i++) {
  //                 patternNotes = patternNotes.concat(pattern.notes);
  //             }
  //             return patternNotes;
  //         } else {
  //             return [];
  //         }
  //     }
  // });
  // if (instrument === 10) {
  //     const len = notes[0].bars.length;
  //     for (let i=0; i<len; ++i) {
  //         const batterie = notes.map(note => [note.note, note.bars[i]]);
  //         const toPlay = batterie
  //             .filter(instrument => instrument[1] === 1)
  //             .map(instrument => instrument[0]);
  //         if (toPlay.length === 0) {
  //             continue;
  //         }
  //         const noteOptions: any = {
  //             pitch: toPlay.map(note => getDrumInstrument(note)),
  //             velocity: 100,
  //             duration: 'd2',
  //             channel: 10,
  //         };
  //         trackMidi.addEvent(new MidiWriter.NoteEvent(noteOptions));
  //     }
  // }

  const write = new MidiWriter.Writer(midiTracks);
  const midiData = write.buildFile();
  fs.writeFileSync(generatedFilePath, midiData, "binary");

  return generatedFilePath;
}
