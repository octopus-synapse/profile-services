import {
  USERNAME_ENDS_OK_SOURCE,
  USERNAME_FORBIDDEN_DOUBLE_UNDERSCORE,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN_SOURCE,
  USERNAME_STARTS_OK_SOURCE,
  USERNAME_UPDATE_COOLDOWN_DAYS,
} from '../../../domain/value-objects/username-rules.const';
import {
  GetUsernameRulesUseCasePort,
  type UsernameRules,
} from '../../ports/get-username-rules.use-case.port';

/**
 * Returns the public username format rules (no I/O, no DB). Pure passthrough
 * over the domain constants — present as a use case so the route depends on
 * the application port, not a const import (mockable, swappable).
 */
export class GetUsernameRulesUseCase extends GetUsernameRulesUseCasePort {
  execute(): UsernameRules {
    return {
      pattern: USERNAME_PATTERN_SOURCE,
      startsWithPattern: USERNAME_STARTS_OK_SOURCE,
      endsWithPattern: USERNAME_ENDS_OK_SOURCE,
      forbiddenSubstring: USERNAME_FORBIDDEN_DOUBLE_UNDERSCORE,
      minLength: USERNAME_MIN_LENGTH,
      maxLength: USERNAME_MAX_LENGTH,
      cooldownDays: USERNAME_UPDATE_COOLDOWN_DAYS,
    };
  }
}
