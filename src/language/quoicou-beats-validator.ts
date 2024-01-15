import type { ValidationAcceptor, ValidationChecks } from "langium";
import type { QuoicouBeatsServices } from "./quoicou-beats-module.js";
import instruments from "../instruments.json" assert { type: "json" };
import keyboard_instrument from "../keyboard_instruments.json" assert { type: "json" };
import {
    ClassicNote,
    isClassicNote,
    isDrumNote, isPatternReference,
    Keyboard,
    Music,
    PatternDeclaration,
    QuoicouBeatsAstType,
    Track
} from './generated/ast.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: QuoicouBeatsServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.QuoicouBeatsValidator;
    const checks: ValidationChecks<QuoicouBeatsAstType> = {
        Music: [
            validator.checkTempoIsCorrect.bind(validator),
            validator.checkTicksCountIsCorrect.bind(validator),
            validator.checkDenominatorIsCorrect.bind(validator),
            validator.checkNumeratorIsCorrect.bind(validator),
            validator.checkIsValidInstrumentMusic.bind(validator),
            validator.checkDefaultOctaveIsCorrectOrNecessary.bind(validator),
            validator.checkDefaultNoteTypeIsCorrectOrNecessary.bind(validator),
        ],
        Keyboard: [
            validator.checkIsValidInstrumentKeyboard.bind(validator),
            validator.checkKeyboardIsNotAlreadyUsed.bind(validator),
        ],
        PatternDeclaration: [
            validator.checkPatternIsCorrect.bind(validator),
        ],
        Track: [
            validator.checkTrackNotesAreCorrect.bind(validator),
        ],
        ClassicNote: [
            validator.checkOctaveIsCorrect.bind(validator),
        ],
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class QuoicouBeatsValidator {

    checkTempoIsCorrect(music: Music, accept: ValidationAcceptor): void {
        const tempo = music.tempo;
        if (tempo <= 0) {
            accept("error", "The tempo cannot be lower or equal to 0.", {
                node: music,
                property: "tempo",
            });
        }
    }

    // Validators for Music
    checkTicksCountIsCorrect(music: Music, accept: ValidationAcceptor): void {
        if (music.tickCount > 128) {
            accept("error", "Song definition cannot be higher than 128.", {
                node: music,
                property: "tickCount",
            });
        } else if (music.tickCount <= 0) {
            accept("error", "Song definition cannot be lower or equal to 0.", {
                node: music,
                property: "tickCount",
            });
        }
    }

    checkIsValidInstrumentMusic(music: Music, accept: ValidationAcceptor): void {
        for (const track of music.tracks) {
            const instrument = track.instrument.instrument;
            if (!Object.keys(instruments).includes(instrument))
                accept("error", `Instrument ${instrument} is not supported.`, {
                    node: track,
                    property: "instrument",
                });
        }
    }

    checkDenominatorIsCorrect(music: Music, accept: ValidationAcceptor): void {
        const denominator = music.denominator;
        if (
            !(Number.isInteger(denominator) && denominator > 0 && denominator <= 12)
        ) {
            accept("error", "The denominator must be between 1 and 12.", {
                node: music,
                property: "denominator",
            });
        }
    }

    checkNumeratorIsCorrect(music: Music, accept: ValidationAcceptor): void {
        const numerator = music.numerator;
        if (
            !(
                Number.isInteger(numerator) &&
                numerator > 0 &&
                [1, 2, 4, 8, 16].includes(numerator)
            )
        ) {
            accept("error", "The numerator must be 1, 2, 4, 8 or 16.", {
                node: music,
                property: "numerator",
            });
        }
    }

    // Check if pattern is correct (drum and classic note cannot be mixed)
    checkPatternIsCorrect(pattern: PatternDeclaration, accept: ValidationAcceptor): void {
        const isDrumNotes = isDrumNote(pattern.notes[0]);
        pattern.notes.forEach(note => {
            if (isDrumNotes != isDrumNote(note)) {
                accept('error', `The pattern ${pattern.name} contains both drum notes and classic notes, it is not allowed.`, {
                    node: pattern,
                    property: 'notes'
                });
            }
        });
    }

    // Check if track notes are correct (drum and classic notes cannot be mixed)
    checkTrackNotesAreCorrect(track: Track, accept: ValidationAcceptor): void {
        const isDrum = track.instrument.instrument === 'Drums';
        track.notes.forEach(patternOrNote => {
            if (isPatternReference(patternOrNote)) {
                if (patternOrNote.repeatCount !== undefined && patternOrNote.repeatCount <= 0) {
                    accept('error', `The track ${track.name} contains a pattern reference with a repeat count <= of 0, it is not allowed.`, {
                        node: track,
                        property: 'notes'
                    });
                }
                if (isDrum != isDrumNote(patternOrNote.pattern.ref?.notes[0])) {
                    accept('error', `The track ${track.name} contains both drum notes and classic notes, it is not allowed.`, {
                        node: track,
                        property: 'notes'
                    });
                }
            } else if (isDrum != isDrumNote(patternOrNote)) {
                accept('error', `The track ${track.name} contains both drum notes and classic notes, it is not allowed.`, {
                    node: track,
                    property: 'notes'
                });
            }
        });
    }

    checkDefaultOctaveIsCorrectOrNecessary(music: Music, accept: ValidationAcceptor): void {
        if (music.defaultOctave === undefined) {
            // Check if an octave is undefined and if so, throw an error
            music.tracks.forEach(track => {
                track.notes.filter((note) => isClassicNote(note)).forEach(note => {
                    if (isClassicNote(note) && note.octave === undefined) {
                        accept('error', `Presence of undefined octave in a Note inside the track ${track.name}, the default octave must be defined.`, {
                            node: music,
                            property: 'defaultOctave'
                        });
                    }
                });
            });
            music.patterns.forEach(pattern => {
                pattern.notes.forEach(note => {
                    if (isClassicNote(note) && note.octave === undefined) {
                        accept('error', `Presence of undefined octave in a Note inside the pattern ${pattern.name}, the default octave must be defined.`, {
                            node: music,
                            property: 'defaultOctave'
                        });
                    }
                });
            });
        }
        else if (music.defaultOctave < -1 || music.defaultOctave > 9) {
            accept('error', `The default octave must be between -1 and 9.`, {
                node: music,
                property: 'defaultOctave'
            });
        }
    }

    checkDefaultNoteTypeIsCorrectOrNecessary(music: Music, accept: ValidationAcceptor): void {
        if (music.defaultNoteType === undefined || music.defaultNoteType === '') {
            // Check if an octave is undefined and if so, throw an error
            music.tracks.forEach(track => {
                track.notes.forEach(note => {
                    if (isClassicNote(note) && (note.noteType === undefined || note.noteType === '')) {
                        accept('error', `Presence of an undefined note type in a Note inside the track ${track.name}, the default note type must be defined!`, {
                            node: music,
                            property: 'defaultNoteType'
                        });
                    }
                });
            });
            music.patterns.forEach(pattern => {
                pattern.notes.forEach(note => {
                    if (isClassicNote(note) && (note.noteType === undefined || note.noteType === '')) {
                        accept('error', `Presence of an undefined note type in a Note inside the pattern ${pattern.name}, the default note type must be defined!`, {
                            node: music,
                            property: 'defaultNoteType'
                        });
                    }
                });
            });
        }
    }

    checkOctaveIsCorrect(note: ClassicNote, accept: ValidationAcceptor): void {
        if (note.octave !== undefined && (note.octave < -1 || note.octave > 9)) {
            accept('error', `The octave must be between -1 and 9.`, {
                node: note,
                property: 'octave'
            });
        }
    }


    // Validators for Keyboard
    checkIsValidInstrumentKeyboard(
        keyboard: Keyboard,
        accept: ValidationAcceptor
    ): void {
        const instrument = keyboard.bindingConf.instrument.instrument;
        if (!Object.keys(keyboard_instrument).includes(instrument))
            accept("error", `Instrument ${instrument} is not supported.`, {
                node: keyboard.bindingConf,
                property: "instrument",
            });
    }

    checkKeyboardIsNotAlreadyUsed(
        keyboard: Keyboard,
        accept: ValidationAcceptor
    ): void {
        const bindings = keyboard.bindingConf.bindings;
        const alreadyDefinedKey: String[] = [];
        const alreadyDefinedNote: String[] = [];
        for (const binding of bindings) {
            // Si il y a un # à la fin, erreur
            if (binding.note.charAt(binding.note.length - 1) === "#")
                accept("error", "The key should not contain #.", { node: binding });

            // Si ce n'est pas en majuscule, erreur
            if (!binding.key)
                accept(
                    "error",
                    `The key is not recognized. Must be any character (not space).`,
                    { node: binding }
                );

            binding.key = binding.key.toUpperCase();

            if (alreadyDefinedKey.includes(binding.key))
                accept("error", `The key ${binding.key} is already used.`, {
                    node: binding,
                });
            if (alreadyDefinedNote.includes(binding.note))
                accept("error", `The note ${binding.note} is already used.`, {
                    node: binding,
                });
            alreadyDefinedKey.push(binding.key);
            alreadyDefinedNote.push(binding.note);
        }
    }

    /**
     * TODO: Vérifier que le delay est inférieur à la durée de la note précédente
     * par exemple ce cas n'est pas possible :
     *                 Re 4 noire (noire)
     *                 Mi 4 ronde (noire)
     * parce que la note Mi 4 est jouée avant la fin de la note Re 4 donc pas besoin de delay
     */
}
