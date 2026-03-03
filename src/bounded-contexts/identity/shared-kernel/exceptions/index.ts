/**
 * Domain Exceptions - Identity Shared Kernel
 *
 * These exceptions are framework-agnostic and can be used
 * in use-cases without coupling to HTTP or any framework.
 */

export {
  ConflictException,
  EmailAlreadyExistsException,
} from './conflict.exception';
export { DomainException } from './domain.exception';
export { ForbiddenException } from './forbidden.exception';
export { EntityNotFoundException } from './not-found.exception';
export {
  InvalidCredentialsException,
  InvalidTokenException,
  UnauthorizedException,
} from './unauthorized.exception';
export { ValidationException } from './validation.exception';
