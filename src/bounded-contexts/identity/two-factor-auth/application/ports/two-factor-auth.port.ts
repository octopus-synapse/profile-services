/**
 * Bundle token for the two-factor-auth BC. Doubles as the TypeScript
 * shape of the use-case bag and the Nest DI token. Composition lives in
 * `two-factor-auth.composition.ts` — Nest-free.
 */

import type { Disable2faUseCase } from '../use-cases/disable-2fa/disable-2fa.use-case';
import type { Get2faStatusUseCase } from '../use-cases/get-2fa-status/get-2fa-status.use-case';
import type { RegenerateBackupCodesUseCase } from '../use-cases/regenerate-backup-codes/regenerate-backup-codes.use-case';
import type { Setup2faUseCase } from '../use-cases/setup-2fa/setup-2fa.use-case';
import type { Validate2faUseCase } from '../use-cases/validate-2fa/validate-2fa.use-case';
import type { VerifyAndEnable2faUseCase } from '../use-cases/verify-and-enable-2fa/verify-and-enable-2fa.use-case';

export abstract class TwoFactorAuthUseCases {
  abstract readonly setup2fa: Setup2faUseCase;
  abstract readonly verifyAndEnable2fa: VerifyAndEnable2faUseCase;
  abstract readonly disable2fa: Disable2faUseCase;
  abstract readonly get2faStatus: Get2faStatusUseCase;
  abstract readonly regenerateBackupCodes: RegenerateBackupCodesUseCase;
  abstract readonly validate2fa: Validate2faUseCase;
}
