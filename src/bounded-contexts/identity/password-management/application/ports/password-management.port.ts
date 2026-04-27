/**
 * Bundle token for the password-management BC. Doubles as the
 * TypeScript shape and the Nest DI token. Each inbound port keeps its
 * own provider in `password-management.module.ts`; the bundle is
 * aggregated via `useFactory` so route handlers receive a single typed
 * dependency.
 */

import type { ChangePasswordPort } from './change-password.port';
import type { ForgotPasswordPort } from './forgot-password.port';
import type { ResetPasswordPort } from './reset-password.port';

export abstract class PasswordManagementUseCases {
  abstract readonly changePassword: ChangePasswordPort;
  abstract readonly forgotPassword: ForgotPasswordPort;
  abstract readonly resetPassword: ResetPasswordPort;
}
