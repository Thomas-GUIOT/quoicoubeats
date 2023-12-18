import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type {Music, QuoicouBeatsAstType} from './generated/ast.js';
import type { QuoicouBeatsServices } from './quoicou-beats-module.js';
import instruments from '../instruments.json';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: QuoicouBeatsServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.QuoicouBeatsValidator;
    const checks: ValidationChecks<QuoicouBeatsAstType> = {
        Music: [validator.checkTicksIsUnder128.bind(validator), validator.checkIsValidInstrument.bind(validator)]
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class QuoicouBeatsValidator {

    checkTicksIsUnder128(music: Music, accept: ValidationAcceptor): void {
        if (parseInt(music.tickCount) > 128) {
            accept('error', 'Song definition cannot be higher than 128.', { node: music, property: 'tickCount' });
        }
    }

    checkIsValidInstrument(music: Music, accept: ValidationAcceptor): void {
        for (const track of music.tracks.tracks) {
            const instrument = track.instrument.instrument;
            if (!Object.keys(instruments).includes(instrument))
                accept('error', `Instrument ${instrument} is not supported.`, { node: track, property: 'instrument' });
        }
    }
}
