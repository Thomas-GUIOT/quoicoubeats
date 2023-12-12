import * as path from 'node:path';
import { extractDestinationAndName } from './cli-util.js';
import {Music} from "../language/generated/ast.js";
import {CompositeGeneratorNode, NL, toString} from "langium";
import fs from "fs";

function noteToMidi(note: string): number {
    // Convertit une note de musique en son équivalent MIDI
    // Vous devrez peut-être ajuster cette fonction en fonction de la façon dont vos notes sont représentées
    const notes = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
    return notes.indexOf(note) + 60; // 60 est la valeur MIDI pour le Do central
}

function noteTypeToDuration(noteType: string): string {
    // Convertit un type de note en sa durée équivalente en MIDI
    // Vous devrez peut-être ajuster cette fonction en fonction de la façon dont vos notes sont représentées
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
    const generatedFilePath = `${path.join(data.destination, data.name)}.js`;
    const fileNode = new CompositeGeneratorNode();

    generateImports(music, fileNode);
    generateNotes(music, fileNode);
    exportGenerator(data, fileNode);

    fs.writeFileSync(generatedFilePath, toString(fileNode));
    return generatedFilePath;
}

function generateImports(music: Music, fileNode: CompositeGeneratorNode) {
    fileNode.append(`const MidiWriter = require('midi-writer-js');`, NL);
    fileNode.append(`const fs = require('fs');`, NL);
}

function generateNotes(music: Music, fileNode: CompositeGeneratorNode) {
    const numerator = parseInt(music.numerator);
    const denominator = parseInt(music.denominator);
    fileNode.append(`
    let midiTracks = [];
    `, NL);
    music.tracks.tracks.forEach(track => {
        fileNode.append(`
        const trackMidi = new MidiWriter.Track();
        trackMidi.setTimeSignature(${numerator}, ${denominator}, 24, 8);

        trackMidi.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 1}));
        `);
        track.notes.forEach(note => {
            fileNode.append(`
            trackMidi.addEvent(new MidiWriter.NoteEvent({pitch: [${noteToMidi(note.note)}], duration: ${noteTypeToDuration(note.noteType)}}));
            `);
        });
        fileNode.append(`midiTracks.push(trackMidi);`);
    });
}

function exportGenerator(data: any, fileNode: CompositeGeneratorNode) {
    fileNode.append(`
    const write = new MidiWriter.Writer(midiTracks);
    const midiData = write.buildFile();
    fs.writeFileSync('./${data.name}.mid', midiData, 'binary');
    `);
}
