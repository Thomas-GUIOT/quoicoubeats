import * as path from 'node:path';
import { extractDestinationAndName } from './cli-util.js';
import {Music} from "../language/generated/ast.js";
import MidiWriter from 'midi-writer-js';
import * as fs from "fs";

const MIDI_ON_Stack: any[] = [];
const MIDI_OFF_Stack: any[] = [];

// function noteToMidi(note: string): number {
//     // TODO: modifier pour prendre en compte les octaves
//     const notes = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
//     return notes.indexOf(note) + 60; // 60 est la valeur MIDI pour le Do central
// }

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
    switch (noteType) {
        case 'ronde':
            return ticks * 4;
        case 'blanche':
            return ticks * 2;
        case 'noire':
            return ticks;
        case 'croche':
            return ticks / 2;
        case 'doubleCroche':
            return ticks / 4;
        case 'tripleCroche':
            return ticks / 8;
        case 'quadrupleCroche':
            return ticks / 16;
        default:
            throw new Error(`Type de note inconnu: ${noteType}`);
    }
}

function fillStacks(music: Music) {
    let timeMark = 0;
    music.tracks.tracks.forEach(track => {
        track.notes.forEach(note => {
            console.log(`note: ${note.note} ${note.noteType}`)
            const endTickMark = noteTypeToTicks(note.noteType, parseInt(music.tickCount));
            const noteDelay = note.delay.flatMap(delay => delay).reduce((a, b) => a + noteTypeToTicks(b,parseInt(music.tickCount)), 0);
            timeMark += noteDelay;
            console.log(`timeMark: ${timeMark} length: ${noteTypeToTicks(note.noteType,parseInt(music.tickCount))} endTickMark: ${timeMark + endTickMark} noteDelay: ${noteDelay}`)
            MIDI_ON_Stack.push({
                tickMark: timeMark + noteDelay,
                note: note,
            });
            MIDI_OFF_Stack.push({
                tickMark: timeMark + endTickMark,
                note: note,
            });
        });
    });
    console.log('----')
    MIDI_ON_Stack.sort((a, b) => b.tickMark - a.tickMark);
    MIDI_OFF_Stack.sort((a, b) => b.tickMark - a.tickMark);
    // Compare each stack and pop and console log the one with the lowest tickMark until every stack is empty if the tickMark are equal pop ON first
    while (MIDI_ON_Stack.length > 0 || MIDI_OFF_Stack.length > 0) {
        if (MIDI_ON_Stack.length > 0 && MIDI_OFF_Stack.length > 0) {
            if (MIDI_ON_Stack[MIDI_ON_Stack.length - 1].tickMark < MIDI_OFF_Stack[MIDI_OFF_Stack.length - 1].tickMark) {
                console.log(`ON: ${MIDI_ON_Stack[MIDI_ON_Stack.length - 1].note.note} ${MIDI_ON_Stack[MIDI_ON_Stack.length - 1].note.noteType}`);
                MIDI_ON_Stack.pop();
            } else if (MIDI_ON_Stack[MIDI_ON_Stack.length - 1].tickMark === MIDI_OFF_Stack[MIDI_OFF_Stack.length - 1].tickMark) {
                console.log(`ON: ${MIDI_ON_Stack[MIDI_ON_Stack.length - 1].note.note} ${MIDI_ON_Stack[MIDI_ON_Stack.length - 1].note.noteType}`);
                MIDI_ON_Stack.pop();
                console.log(`OFF: ${MIDI_OFF_Stack[MIDI_OFF_Stack.length - 1].note.note} ${MIDI_OFF_Stack[MIDI_OFF_Stack.length - 1].note.noteType}`);
                MIDI_OFF_Stack.pop();
            } else {
                console.log(`OFF: ${MIDI_OFF_Stack[MIDI_OFF_Stack.length - 1].note.note} ${MIDI_OFF_Stack[MIDI_OFF_Stack.length - 1].note.noteType}`);
                MIDI_OFF_Stack.pop();
            }
        } else if (MIDI_ON_Stack.length > 0) {
            console.log(`ON: ${MIDI_ON_Stack[MIDI_ON_Stack.length - 1].note.note} ${MIDI_ON_Stack[MIDI_ON_Stack.length - 1].note.noteType}`);
            MIDI_ON_Stack.pop();
        } else if (MIDI_OFF_Stack.length > 0) {
            console.log(`OFF: ${MIDI_OFF_Stack[MIDI_OFF_Stack.length - 1].note.note} ${MIDI_OFF_Stack[MIDI_OFF_Stack.length - 1].note.noteType}`);
            MIDI_OFF_Stack.pop();
        }
    }

}

export function generateJavaScript(music: Music, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.mid`;

    fillStacks(music);

    const numerator = parseInt(music.numerator);
    const denominator = parseInt(music.denominator);
    let midiTracks: MidiWriter.Track[] = [];
    // let silence : number = 0;
    // let channel : number = 1;
    music.tracks.tracks.forEach(track => {
        const trackMidi = new MidiWriter.Track();
        const instrument = parseInt(track.instrument.instrument);
        trackMidi.addEvent(new MidiWriter.TimeSignatureEvent(numerator, denominator, 24, 8));
        trackMidi.addEvent(new MidiWriter.ProgramChangeEvent({instrument: instrument}));
        trackMidi.addInstrumentName(track.name);
        trackMidi.setTempo(parseInt(music.tempo));

        fillStacks(music);
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
