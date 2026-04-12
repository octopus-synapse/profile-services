import type { SemanticResumeSnapshot } from '../../interfaces';
import type { ValidationResult } from '../../interfaces/validation-result.interface';

export interface SemanticPolicy {
  validate(snapshot: SemanticResumeSnapshot): ValidationResult;
}
