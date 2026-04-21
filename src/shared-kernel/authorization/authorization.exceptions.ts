/**
 * Authorization Exceptions
 *
 * Typed exceptions for authorization/authentication guards in the shared kernel.
 * Each carries a stable `code` for localizable error envelopes.
 */
import { DomainException } from '@/shared-kernel/exceptions';

export class AuthenticationRequiredException extends DomainException {
  readonly code: string = 'AUTHENTICATION_REQUIRED';
  readonly statusHint = 401;
  constructor() {
    super('Authentication required');
  }
}

export class UserRolesNotAvailableException extends DomainException {
  readonly code: string = 'USER_ROLES_NOT_AVAILABLE';
  readonly statusHint = 403;
  constructor() {
    super('User roles not available. Ensure AuthorizationModule is imported.');
  }
}

export class MissingRequiredPermissionsException extends DomainException {
  readonly code: string = 'MISSING_REQUIRED_PERMISSIONS';
  readonly statusHint = 403;
  constructor(public readonly permissions: string[]) {
    super(`Permission denied: requires all of [${permissions.join(', ')}]`);
  }
}

export class MissingAnyRequiredPermissionException extends DomainException {
  readonly code: string = 'MISSING_ANY_REQUIRED_PERMISSION';
  readonly statusHint = 403;
  constructor(public readonly permissions: string[]) {
    super(`Permission denied: requires any of [${permissions.join(', ')}]`);
  }
}

export class MissingRequiredRolesException extends DomainException {
  readonly code: string = 'MISSING_REQUIRED_ROLES';
  readonly statusHint = 403;
  constructor(public readonly roles: string[]) {
    super(`Permission denied: requires any role of [${roles.join(', ')}]`);
  }
}

export class OwnershipResourceMissingException extends DomainException {
  readonly code: string = 'OWNERSHIP_RESOURCE_MISSING';
  readonly statusHint = 403;
  constructor() {
    super('Resource not found');
  }
}

export class OwnershipAccessDeniedException extends DomainException {
  readonly code: string = 'OWNERSHIP_ACCESS_DENIED';
  readonly statusHint = 403;
  constructor() {
    super('You do not own this resource');
  }
}

export class OwnershipMissingParamException extends DomainException {
  readonly code: string = 'OWNERSHIP_MISSING_PARAM';
  readonly statusHint = 400;
  constructor(public readonly paramName: string) {
    super(`Missing parameter: ${paramName}`);
  }
}

export class OwnershipUnknownModelException extends DomainException {
  readonly code: string = 'OWNERSHIP_UNKNOWN_MODEL';
  readonly statusHint = 500;
  constructor(public readonly model: string) {
    super(`Unknown model: ${model}`);
  }
}
