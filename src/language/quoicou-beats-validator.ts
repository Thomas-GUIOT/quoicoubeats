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
        Music: [validator.checkTicksIsUnder128.bind(validator)]
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

}
