import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type {Music, QuoicouBeatsAstType} from './generated/ast.js';
import type { QuoicouBeatsServices } from './quoicou-beats-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: QuoicouBeatsServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.QuoicouBeatsValidator;
    const checks: ValidationChecks<QuoicouBeatsAstType> = {
        Music: [validator.checkTicksIsUnder128.bind(validator),
                validator.checkDenominatorIsCorrect.bind(validator),
                validator.checkNumeratorIsCorrect.bind(validator)]
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
}
