// NestJS Modules

export { AccountLifecycleModule } from './account-lifecycle/account-lifecycle.module';
export { AuthenticationModule } from './authentication/authentication.module';
export { EmailVerificationModule } from './email-verification/email-verification.module';
export { IdentityModule } from './identity.module';
export { PasswordManagementModule } from './password-management/password-management.module';

// Shared Kernel Exceptions
export {
  ConflictException,
  DomainException,
  EmailAlreadyExistsException,
  EntityNotFoundException,
  ForbiddenException,
  InvalidCredentialsException,
  InvalidTokenException,
  UnauthorizedException,
  ValidationException,
} from './shared-kernel/exceptions';

// Shared Kernel Ports
export type { EventBusPort } from './shared-kernel/ports/event-bus.port';
