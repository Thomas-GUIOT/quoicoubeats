import * as path from 'node:path';
import { extractDestinationAndName } from './cli-util.js';
import {isDrumNote, isNote, Music} from "../language/generated/ast.js";
import MidiWriter from 'midi-writer-js';
import * as fs from "fs";

// get content of ../instruments.json in ES6
const instruments = JSON.parse(fs.readFileSync('./instruments.json', 'utf8'));


console.log(instruments);

function noteToMidi(note: string): number {
    // TODO: modifier pour prendre en compte les octaves
    const notes = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
    return notes.indexOf(note) + 60; // 60 est la valeur MIDI pour le Do central
}

function noteTypeToDuration(noteType: string): string {
    switch (noteType) {
        case 'ronde':
            return '1';
        case 'blanche':
            return '2';
        case 'noire':
            return '4';
        case 'croche':
            return '8';
        case 'doubleCroche':
            return '16';
        case 'tripleCroche':
            return '32';
        case 'quadrupleCroche':
            return '64';
        default:
            throw new Error(`Type de note inconnu: ${noteType}`);
    }
}

function getDrumInstrument(note: string): number {
    switch (note) {
        case 'kd':
        case 'bd':
            return 35;
        case 'sd':
            return 38;
        case 'hh':
        case 'ch':
            return 42;
        case 'oh':
            return 46;
        default:
            return 56;
    }
}

export function generateJavaScript(music: Music, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.mid`;

    const numerator = parseInt(music.numerator);
    const denominator = parseInt(music.denominator);
    let midiTracks: MidiWriter.Track[] = [];
    let silence : number = 0;
    let channel : number = 1;
    music.tracks.tracks.forEach(track => {
        const trackMidi = new MidiWriter.Track();
        const instrumentNumber = instruments[track.instrument.instrument];
        trackMidi.addEvent(new MidiWriter.TimeSignatureEvent(numerator, denominator, 24, 8));
        trackMidi.addEvent(new MidiWriter.ProgramChangeEvent({instrument: instrumentNumber}));
        trackMidi.addInstrumentName(track.name);
        trackMidi.setTempo(parseInt(music.tempo));
        const notes = track.notesOrPatterns.flatMap(noteOrPattern => {
            if (isNote(noteOrPattern)) {
                return noteOrPattern;
            } if (isDrumNote(noteOrPattern)) {
                return noteOrPattern;
            }
            else {
                const pattern = music.patterns.find(pattern => pattern.name === noteOrPattern.pattern.ref?.name);
                if (pattern) {
                    let patternNotes: any[] = [];
                    let repeatCount = 1;
                    if (noteOrPattern.repeatCount != null) {
                        repeatCount = parseInt(noteOrPattern.repeatCount);
                    }
                    for (let i = 0; i < repeatCount; i++) {
                        patternNotes = patternNotes.concat(pattern.notes);
                    }
                    return patternNotes;
                } else {
                    return [];
                }
            }
        });
        if (instrumentNumber === 10) {
            const len = notes[0].bars.length;
            for (let i=0; i<len; ++i) {
                const batterie = notes.map(note => [note.note, note.bars[i]]);
                const toPlay = batterie
                    .filter(instrument => instrument[1] === 1)
                    .map(instrument => instrument[0]);
                if (toPlay.length === 0) {
                    continue;
                }
                const noteOptions: any = {
                    pitch: toPlay.map(note => getDrumInstrument(note)),
                    velocity: 100,
                    duration: 'd2',
                    channel: 10,
                };
                trackMidi.addEvent(new MidiWriter.NoteEvent(noteOptions));
            }
        } else {
            notes.forEach(note => {
                if (note.note === 'Silence') {
                    silence += parseInt(noteTypeToDuration(note.noteType));
                    return;
                }
                let noteOptions: any = {
                    pitch: [noteToMidi(note.note)],
                    duration: noteTypeToDuration(note.noteType),
                    velocity: 100,
                    channel: channel,
                };
                if (silence > 0) {
                    noteOptions.wait = noteTypeToDuration(note.noteType);
                }
                trackMidi.addEvent(new MidiWriter.NoteEvent(noteOptions));
                silence = 0;
            });
        }
        midiTracks.push(trackMidi)
    });

    const write = new MidiWriter.Writer(midiTracks);
    const midiData = write.buildFile();
    fs.writeFileSync(generatedFilePath, midiData, 'binary');

    return generatedFilePath;
}
