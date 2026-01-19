/**
 * Auth Repositories
 * Barrel export for all auth infrastructure repositories
 */

export { AuthUserRepository } from './auth-user.repository';
export type {
  UserWithPassword,
  UserForAuth,
  CreateUserData,
} from './auth-user.repository';

export { VerificationTokenRepository } from './verification-token.repository';
export type { CreateTokenData } from './verification-token.repository';

export { TwoFactorAuthRepository } from './two-factor-auth.repository';

export { UserConsentRepository } from './user-consent.repository';

export { GdprRepository } from './gdpr.repository';
export type {
  ResumeWithRelationsForExport,
  AuditLogForExport,
  CascadingDeletionResult,
} from './gdpr.repository';
