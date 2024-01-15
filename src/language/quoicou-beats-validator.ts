import type { ValidationAcceptor, ValidationChecks } from "langium";
import type { QuoicouBeatsServices } from "./quoicou-beats-module.js";
import instruments from "../instruments.json" assert { type: "json" };
import keyboard_instrument from "../keyboard_instruments.json" assert { type: "json" };
import {isClassicNote, Keyboard, Music, QuoicouBeatsAstType} from './generated/ast.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: QuoicouBeatsServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.QuoicouBeatsValidator;
    const checks: ValidationChecks<QuoicouBeatsAstType> = {
        Music: [
            validator.checkTicksIsUnder128.bind(validator),
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
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class QuoicouBeatsValidator {
    // Validators for Music

    checkTicksIsUnder128(music: Music, accept: ValidationAcceptor): void {
        if (parseInt(music.tickCount) > 128) {
            accept("error", "Song definition cannot be higher than 128.", {
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
        const denominator = parseInt(music.denominator);
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
        const numerator = parseInt(music.numerator);
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

    checkDefaultOctaveIsCorrectOrNecessary(music: Music, accept: ValidationAcceptor): void {
        if (music.defaultOctave === undefined || music.defaultOctave === '') {
            // Check if an octave is undefined and if so, throw an error
            music.tracks.forEach(track => {
                track.notes.filter((note) => isClassicNote(note)).forEach(note => {
                    if (isClassicNote(note)) {
                        if (note.octave === undefined || note.octave === '') {
                            accept('error', 'Presence of octave not defined, the default octave must be defined.', { node: music, property: 'defaultOctave' });
                        }
                    }
                });
            });
        }
        else {
            // Check if the default octave is an integer
            const defaultOctave = parseInt(music.defaultOctave);
            if (!(Number.isInteger(defaultOctave))) {
                accept('error', 'The default octave must be an integer.', { node: music, property: 'defaultOctave' });
            }
        }
    }

    checkDefaultNoteTypeIsCorrectOrNecessary(music: Music, accept: ValidationAcceptor): void {
        if (music.defaultNoteType === undefined || music.defaultNoteType === '') {
            // Check if an octave is undefined and if so, throw an error
            music.tracks.forEach(track => {
                track.notes.filter(note => isClassicNote(note)).forEach(note => {
                    if (isClassicNote(note)) {
                        if (note.noteType === undefined || note.noteType === '') {
                            accept('error', 'Presence of note type not defined, the default note type must be defined.', { node: music, property: 'defaultNoteType' });
                        }
                    }
                });
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
