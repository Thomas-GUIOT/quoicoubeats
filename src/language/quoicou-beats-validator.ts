import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { QuoicouBeatsAstType, Person } from './generated/ast.js';
import type { QuoicouBeatsServices } from './quoicou-beats-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: QuoicouBeatsServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.QuoicouBeatsValidator;
    const checks: ValidationChecks<QuoicouBeatsAstType> = {
        Person: validator.checkPersonStartsWithCapital
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class QuoicouBeatsValidator {

    checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    }

}
