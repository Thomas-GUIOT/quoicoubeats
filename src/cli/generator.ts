import * as path from 'node:path';
import { extractDestinationAndName } from './cli-util.js';
import {Music} from "../language/generated/ast.js";
import MidiWriter from 'midi-writer-js';
import * as fs from "fs";

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

export function generateJavaScript(music: Music, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const generatedFilePath = `${path.join(data.destination, data.name)}.mid`;

    const numerator = parseInt(music.numerator);
    const denominator = parseInt(music.denominator);
    let midiTracks: MidiWriter.Track[] = [];
    music.tracks.tracks.forEach(track => {
        const trackMidi = new MidiWriter.Track();
        trackMidi.addEvent(new MidiWriter.TimeSignatureEvent(numerator, denominator, 24, 8));
        trackMidi.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 1}));
        track.notes.forEach(note => {
            if (note.note === 'Silence') {
                trackMidi.addEvent(new MidiWriter.NoteEvent({
                    pitch: [noteToMidi('Do')],
                    duration: noteTypeToDuration(note.noteType),
                    velocity: 1
                }));
                return;
            }
            trackMidi.addEvent(new MidiWriter.NoteEvent({
                pitch: [noteToMidi(note.note)],
                duration: noteTypeToDuration(note.noteType),
                velocity: 100
            }));
        });
        midiTracks.push(trackMidi)
    });

    const write = new MidiWriter.Writer(midiTracks);
    const midiData = write.buildFile();
    fs.writeFileSync(generatedFilePath, midiData, 'binary');

    return generatedFilePath;
}
