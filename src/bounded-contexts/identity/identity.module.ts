import { Module } from '@nestjs/common';
import { AccountLifecycleModule } from './account-lifecycle';
import { AuthenticationModule } from './authentication';
import { EmailVerificationModule } from './email-verification';
import { OAuthModule } from './oauth/oauth.module';
// Bounded Context Modules
import { PasswordManagementModule } from './password-management';
import { TwoFactorAuthModule } from './two-factor-auth';

/**
 * Identity Module
 *
 * Aggregates all Identity-related Bounded Contexts following
 * the Hexagonal Modular Architecture pattern.
 *
 * Bounded Contexts:
 * - Password Management: Forgot/Reset/Change password flows
 * - Email Verification: Send verification email, verify email
 * - Account Lifecycle: Create/Deactivate/Delete account
 * - Authentication: Login/Logout/Token refresh
 * - Two-Factor Auth: TOTP-based 2FA setup, verification, backup codes
 */
@Module({
  imports: [
    PasswordManagementModule,
    EmailVerificationModule,
    AccountLifecycleModule,
    AuthenticationModule,
    TwoFactorAuthModule,
    OAuthModule,
  ],
  exports: [
    PasswordManagementModule,
    EmailVerificationModule,
    AccountLifecycleModule,
    AuthenticationModule,
    TwoFactorAuthModule,
    OAuthModule,
  ],
})
export class IdentityModule {}
