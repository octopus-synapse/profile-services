/**
 * Bundle token for the password-management BC. Doubles as the
 * TypeScript shape and the Nest DI token. Each inbound port keeps its
 * own provider in `password-management.module.ts`; the bundle is
 * aggregated via `useFactory` so route handlers receive a single typed
 * dependency.
 */

import type { ChangePasswordPort } from './change-password.port';
import type { ConfirmEmailChangePort } from './confirm-email-change.port';
import type { ConfirmPasswordChangePort } from './confirm-password-change.port';
import type { ForgotPasswordPort } from './forgot-password.port';
import type { RequestEmailChangePort } from './request-email-change.port';
import type { RequestPasswordChangePort } from './request-password-change.port';
import type { ResetPasswordPort } from './reset-password.port';

export abstract class PasswordManagementUseCases {
  abstract readonly changePassword: ChangePasswordPort;
  abstract readonly requestPasswordChange: RequestPasswordChangePort;
  abstract readonly confirmPasswordChange: ConfirmPasswordChangePort;
  abstract readonly requestEmailChange: RequestEmailChangePort;
  abstract readonly confirmEmailChange: ConfirmEmailChangePort;
  abstract readonly forgotPassword: ForgotPasswordPort;
  abstract readonly resetPassword: ResetPasswordPort;
}
