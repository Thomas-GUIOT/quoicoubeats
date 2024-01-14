import * as path from 'node:path';
import { extractDestinationAndName } from './cli-util.js';
import {QuoicouBeats, Track, Note} from "../language/generated/ast.js";
import MidiWriter from 'midi-writer-js';
import * as fs from "fs";

import instruments from "../instruments.json" assert { type: 'json' };
import keyboard_instruments from "../keyboard_instruments.json" assert { type: 'json' };

const MIDI_ON_Stack: StackNote[] = [];
const MIDI_OFF_Stack: StackNote[] = [];

type StackNote = {
    tickMark: number,
    note: any,
}

/**
 * Return the pitch for a note according to its octave using the MIDI standard (60 for C4)
 * @param note
 */
function noteToPitch(note: any): string {
    const octave = parseInt(note.octave);
    switch (note.note) {
        case 'Do':
        case 'C':
            return (octave * 12).toString();
        case 'Do#':
        case 'C#':
            return (1 + octave * 12).toString();
        case 'Re':
        case 'D':
            return (2 + octave * 12).toString();
        case 'Re#':
        case 'D#':
            return (3 + octave * 12).toString();
        case 'Mi':
        case 'E':
            return (4 + octave * 12).toString();
        case 'Fa':
        case 'F':
            return (5 + octave * 12).toString();
        case 'Fa#':
        case 'F#':
            return (6 + octave * 12).toString();
        case 'Sol':
        case 'G':
            return (7 + octave * 12).toString();
        case 'Sol#':
        case 'G#':
            return (8 + octave * 12).toString();
        case 'La':
        case 'A':
            return (9 + octave * 12).toString();
        case 'La#':
        case 'A#':
            return (10 + octave * 12).toString();
        case 'Si':
        case 'B':
            return (11 + octave * 12).toString();
        default:
            throw new Error(`Note inconnue: ${note.note}`);
    }
}

// function noteTypeToDuration(noteType: string): string {
//     switch (noteType) {
//         case 'ronde':
//             return '1';
//         case 'blanche':
//             return '2';
//         case 'noire':
//             return '4';
//         case 'croche':
//             return '8';
//         case 'doubleCroche':
//             return '16';
//         case 'tripleCroche':
//             return '32';
//         case 'quadrupleCroche':
//             return '64';
//         default:
//             throw new Error(`Type de note inconnu: ${noteType}`);
//     }
// }

// function getDrumInstrument(note: string): number {
//     switch (note) {
//         case 'kd':
//         case 'bd':
//             return 35;
//         case 'sd':
//             return 38;
//         case 'hh':
//         case 'ch':
//             return 42;
//         case 'oh':
//             return 46;
//         default:
//             return 56;
//     }
// }

function noteTypeToTicks(noteType: string, ticks:number): number {
    if (!noteType) return 0;
    const noteTypeToTicks: any = {
        'ronde': 4*ticks,
        'blanche': 2*ticks,
        'noire': ticks,
        'croche': 0.5*ticks,
        'doubleCroche': 0.25*ticks,
        'tripleCroche': 0.125*ticks,
        'quadrupleCroche': 0.0625*ticks,
        'accord': 0,
    }
    if (noteTypeToTicks[noteType] !== undefined) return noteTypeToTicks[noteType];
    else throw new Error(`Type de note inconnu: ${noteType}`);
}

function fillStacks(track: Track, tickCount: number) {
    let previousNoteMarks = {
        start: 0,
        end: 0,
    }

    track.notes.forEach(note => {
        const endTickMark = noteTypeToTicks(note.noteType ?? 'ronde', tickCount);
        const noteDelay = note.delay.flatMap(delay => delay).reduce((a, b) => a + noteTypeToTicks(b,tickCount), 0);
        const notePause = note.pause.flatMap(pause => pause).reduce((a, b) => a + noteTypeToTicks(b,tickCount), 0);
        const noteStart = note.delay.length ? previousNoteMarks.start + noteDelay : previousNoteMarks.end + notePause;
        const noteEnd = noteStart + endTickMark;
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
        }
    });
    MIDI_ON_Stack.sort((a, b) => {
        if (a.tickMark === b.tickMark) {
            if (a.note.delay === 'accord') return 1;
            else return -1;
        }
        else return b.tickMark - a.tickMark;
    });
    MIDI_OFF_Stack.sort((a, b) => {
        if (a.tickMark === b.tickMark) {
            if (a.note.delay === 'accord') return 1;
            else return -1;
        }
        else return b.tickMark - a.tickMark;
    });

    // print both stacks
    console.log('------STACKS------')
    console.log('MIDI_ON_Stack:')
    MIDI_ON_Stack.forEach(note => console.log(`note: ${note.note.note} tickMark: ${note.tickMark}`))
    console.log('MIDI_OFF_Stack:')
    MIDI_OFF_Stack.forEach(note => console.log(`note: ${note.note.note} tickMark: ${note.tickMark}`))
    console.log('------------------')
}

function addOnEvent(track: MidiWriter.Track, note: any, ticks: number) {
    const noteOptions: any = {
        pitch: [noteToPitch(note)],
        velocity: 100,
    };
    const delay = note.delay.flatMap((delay: string) => delay).reduce((a: number, b: string) => a + noteTypeToTicks(b, ticks), 0);
    if (delay > 0) noteOptions.wait = `t${delay}`;
    console.log(`> ON note: ${note.note} options: ${JSON.stringify(noteOptions)}`);
    track.addEvent(new MidiWriter.NoteOnEvent(noteOptions));
}

function addOffEvent(track: MidiWriter.Track, note: any, ticks: number, delta: number | undefined = undefined) {
    // const delayValue = note.delay.flatMap((delay: string) => delay).reduce((a: number, b: string) => a + noteTypeToTicks(b, ticks), 0);
    // console.log(`note: ${note.note} delay: ${note.delay}`)
    const isAccord = note.delay[0] === 'accord';
    // console.log(`isAccord: ${isAccord}`)
    const duration = delta ? 0 : isAccord ? 0 : noteTypeToTicks(note.noteType, ticks);
    // console.log(`duration: ${duration}`)
    // console.log(`delta: ${delta}`)
    const noteOptions: any = {
        pitch: [noteToPitch(note)],
        duration: `t${duration}`,
    };
    if (delta) noteOptions.delta = delta;
    console.log(`> OFF note: ${note.note} options: ${JSON.stringify(noteOptions)}`);
    track.addEvent(new MidiWriter.NoteOffEvent(noteOptions));
}

function generateMidiEvents(trackMidi: MidiWriter.Track, ticks: number) {
    // Add midi events with the correct order until both stack are empty
    let note = null;
    let previousEvents: any = {
        on: {tickMark: 0, note: null},
        off: {tickMark: 0, note: null},
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
            note = MIDI_ON_Stack.pop()?.note;
            // console.log(`on: ${JSON.stringify(note.note) + note.noteType}`)
            addOnEvent(trackMidi, note, ticks);
            previousEvents.on = on;
        } else if (on?.tickMark === off?.tickMark || off) {
            // console.log('on > off')
            note = MIDI_OFF_Stack.pop();
            if (!note) break;
            // console.log(`off: ${JSON.stringify(note.note) + note.noteType}`)
            // console.log(`inspect: ${util.inspect(off)}}`)
            const previousOffEnd = previousEvents.on?.tickMark;
            const previousOffStart = previousEvents.off?.tickMark;
            const mostRecentEvent = previousOffEnd > previousOffStart ? previousOffEnd : previousOffStart;
            console.log(`mostRecentEvent: ${mostRecentEvent}`)
            console.log(`note.tickMark: ${note.tickMark}`)
            let delta = note.tickMark - mostRecentEvent;
            console.log(`delta: ${delta}`)
            if (delta >= 0) addOffEvent(trackMidi, note.note, ticks, delta);
            else addOffEvent(trackMidi, note.note, ticks);
            previousEvents.off = off;
        }
    }
}

function replaceDefaultValue(defaultOctave: string, defaultNoteType: string, note: Note) {
    if (note.octave === undefined || note.octave === '') {
        note.octave = defaultOctave;
    }
    if (note.noteType === undefined || note.noteType === '') {
        note.noteType = defaultNoteType;
    }
}

export function generateKeyboardProgram(model: QuoicouBeats, filePath: string, destination: string | undefined, audioPath: string): string | null {
    if(!model.keyboard) {
        return null;
    }

    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}-wk.html`;

    const keyboardBindingConfig = model.keyboard?.bindingConf;
    const instrumentName = keyboardBindingConfig?.instrument.instrument;
    const instrumentNumber = Object.entries(keyboard_instruments).find(([key, _]) => key === instrumentName)?.[1] ?? 0;

    const notesFolder = path.join('assets', 'instruments', instrumentNumber.toString())
    
    let htmlWriter = `<!DOCTYPE html><html><head><title>${instrumentName} - QuoicouBeats</title></head><body>`

    keyboardBindingConfig?.bindings.forEach(binding => {
        const keyToLowerCase = binding.key.toLowerCase();
        const note = binding.note;
        const notePath = path.join(notesFolder, note + '.mp3');

        htmlWriter += `<p>${keyToLowerCase}: ${note}</div><audio src="${notePath}" id="${keyToLowerCase}"></audio>`
    });

    htmlWriter += `<script>
    document.addEventListener('keydown', e => {
        if (e.repeat) return
        playNote(e.key);
    })

    let playNote = (key) => {
        const noteSound = document.getElementById(key)
        if(!noteSound) return;
        noteSound.currentTime = 0
        noteSound.play()
    }
</script></body></html>`

    fs.writeFileSync(generatedFilePath, htmlWriter, 'utf-8');

    return generatedFilePath;
}

export function generateJavaScript(model: QuoicouBeats, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.mid`;

    const numerator = parseInt(model.music.numerator);
    const denominator = parseInt(model.music.denominator);
    console.log(`numerator: ${numerator} denominator: ${denominator}`)

    const tickCount = parseInt(model.music.tickCount);

    // If default values are needed, their presence is checked in the validator
    // The other value is only used to ensure that the value is not null
    const defaultOctave = model.music.defaultOctave || '5';
    const defaultNoteType = model.music.defaultNoteType || 'noire';

    let midiTracks: MidiWriter.Track[] = [];
    // let silence : number = 0;
    // let channel : number = 1;
    model.music.tracks.forEach((track: Track) => {
        const trackMidi = new MidiWriter.Track();
        const instrumentNumber = Object.entries(instruments).find(([key, _]) => key === track.instrument.instrument)?.[1] ?? 0;
        trackMidi.addEvent(new MidiWriter.TimeSignatureEvent(numerator, denominator, 24, 8));
        trackMidi.addEvent(new MidiWriter.ProgramChangeEvent({instrument: instrumentNumber}));
        trackMidi.addInstrumentName(track.name);
        trackMidi.setTempo(parseInt(model.music.tempo));

        track.notes.forEach(note => {
            replaceDefaultValue(defaultOctave, defaultNoteType, note);
        });

        fillStacks(track, tickCount);
        generateMidiEvents(trackMidi, tickCount);

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
        // } else {
        //     notes.forEach(note => {
        //         if (note.note === 'Silence') {
        //             silence += parseInt(noteTypeToDuration(note.noteType));
        //             return;
        //         }
        //         let noteOptions: any = {
        //             pitch: [noteToMidi(note.note)],
        //             duration: noteTypeToDuration(note.noteType),
        //             velocity: 100,
        //             channel: channel,
        //         };
        //         if (silence > 0) {
        //             noteOptions.wait = noteTypeToDuration(note.noteType);
        //         }
        //         trackMidi.addEvent(new MidiWriter.NoteEvent(noteOptions));
        //         silence = 0;
        //     });
        // }
        midiTracks.push(trackMidi)
    });

    const write = new MidiWriter.Writer(midiTracks);
    const midiData = write.buildFile();
    fs.writeFileSync(generatedFilePath, midiData, 'binary');

    return generatedFilePath;
}
