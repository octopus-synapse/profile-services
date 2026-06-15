import { ValidationException } from '@/shared-kernel/exceptions';

/**
 * Cross-field invariant on a work-experience item: a role tagged with
 * seniority INTERN is, by definition, an internship — so its employmentType
 * must be Internship. Mirrors the app's hard-lock; this is the server-side
 * source of truth. (TRAINEE is CLT and is deliberately NOT constrained.)
 */
export class InvalidEmploymentTypeForInternRoleException extends ValidationException {
  override readonly code: string = 'INVALID_EMPLOYMENT_TYPE_FOR_INTERN_ROLE';
  constructor(public readonly employmentType: string) {
    super(`Internship roles require employmentType "Internship", got "${employmentType}"`);
  }
}
