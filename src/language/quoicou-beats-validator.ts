import type { ValidationAcceptor, ValidationChecks } from 'langium';
import {Keyboard, Music, QuoicouBeatsAstType} from './generated/ast.js';
import type { QuoicouBeatsServices } from './quoicou-beats-module.js';
import instruments from '../instruments.json' assert { type: 'json' };

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: QuoicouBeatsServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.QuoicouBeatsValidator;
    const checks: ValidationChecks<QuoicouBeatsAstType> = {
        Music: [validator.checkTicksIsUnder128.bind(validator),
                validator.checkDenominatorIsCorrect.bind(validator),
                validator.checkNumeratorIsCorrect.bind(validator),
                validator.checkIsValidInstrumentMusic.bind(validator)],
        Keyboard: [validator.checkIsValidInstrumentKeyboard.bind(validator),
                   validator.checkKeyboardIsNotAlreadyUsed.bind(validator)]
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
            accept('error', 'Song definition cannot be higher than 128.', { node: music, property: 'tickCount' });
        }
    }

    checkIsValidInstrumentMusic(music: Music, accept: ValidationAcceptor): void {
        for (const track of music.tracks.tracks) {
            const instrument = track.instrument.instrument;
            if (!Object.keys(instruments).includes(instrument))
                accept('error', `Instrument ${instrument} is not supported.`, { node: track, property: 'instrument' });
        }
    }

    checkDenominatorIsCorrect(music: Music, accept: ValidationAcceptor): void {
        const denominator = parseInt(music.denominator);
        if (!(Number.isInteger(denominator) && denominator > 0 && denominator <= 12)) {
            accept('error', 'The denominator must be between 1 and 12.', { node: music, property: 'denominator' });
        }
    }

    checkNumeratorIsCorrect(music: Music, accept: ValidationAcceptor): void {
        const numerator = parseInt(music.numerator);
        if (!(Number.isInteger(numerator) && numerator > 0 && [1, 2, 4, 8, 16].includes(numerator))) {
            accept('error', 'The numerator must be 1, 2, 4, 8 or 16.', { node: music, property: 'numerator' });
        }
    }

    // Validators for Keyboard

    checkIsValidInstrumentKeyboard(keyboard: Keyboard, accept: ValidationAcceptor): void {
        const instrument = keyboard.bindingConf.instrument.instrument;
        if (!Object.keys(instruments).includes(instrument))
                accept('error', `Instrument ${instrument} is not supported.`, { node: keyboard.bindingConf, property: 'instrument' });
    }

    checkKeyboardIsNotAlreadyUsed(keyboard: Keyboard, accept: ValidationAcceptor): void {
        const bindings = keyboard.bindingConf.bindings;
        const alreadyDefinedKey: String[] = [];
        const alreadyDefinedNote: String[] = [];
        for(const binding of bindings) {
            if(alreadyDefinedKey.includes(binding.key)) accept('error', `The key ${binding.key} is already used.`, { node: binding })
            if(alreadyDefinedNote.includes(binding.note)) accept('error', `The note ${binding.note} is already used.`, { node: binding })
            alreadyDefinedKey.push(binding.key);
            alreadyDefinedNote.push(binding.note);
        }
    }
}
