/**
 * Pure-TS wiring for the two-factor-auth BC. Zero `@nestjs/*` imports.
 *
 * The Nest module is a thin shell that exposes the result of this
 * function as a single provider. The `Validate2faInboundPort` is bound
 * to `bundle.validate2fa` in the module so cross-BC consumers (e.g.
 * authentication) can keep depending on the inbound port.
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { TwoFactorAuthUseCases } from './application/ports/two-factor-auth.port';
import { Disable2faUseCase } from './application/use-cases/disable-2fa/disable-2fa.use-case';
import { Get2faStatusUseCase } from './application/use-cases/get-2fa-status/get-2fa-status.use-case';
import { RegenerateBackupCodesUseCase } from './application/use-cases/regenerate-backup-codes/regenerate-backup-codes.use-case';
import { Setup2faUseCase } from './application/use-cases/setup-2fa/setup-2fa.use-case';
import { Validate2faUseCase } from './application/use-cases/validate-2fa/validate-2fa.use-case';
import { VerifyAndEnable2faUseCase } from './application/use-cases/verify-and-enable-2fa/verify-and-enable-2fa.use-case';
import { BcryptHashAdapter } from './infrastructure/adapters/external-services/bcrypt-hash.adapter';
import { QrCodeAdapter } from './infrastructure/adapters/external-services/qrcode.adapter';
import { SpeakeasyTotpAdapter } from './infrastructure/adapters/external-services/speakeasy-totp.adapter';
import { TwoFactorRepository } from './infrastructure/adapters/persistence/two-factor.repository';
import { twoFactorAuthRoutes } from './two-factor-auth.routes';

export { TwoFactorAuthUseCases };

export function buildTwoFactorAuthUseCases(
  prisma: PrismaService,
  cache: CacheService,
  logger: LoggerPort,
): TwoFactorAuthUseCases {
  // Outbound adapters
  const repository = new TwoFactorRepository(prisma);
  const totp = new SpeakeasyTotpAdapter();
  const qr = new QrCodeAdapter();
  const hash = new BcryptHashAdapter();

  return {
    setup2fa: new Setup2faUseCase(repository, totp, qr, logger),
    verifyAndEnable2fa: new VerifyAndEnable2faUseCase(repository, totp, hash, logger),
    disable2fa: new Disable2faUseCase(repository),
    get2faStatus: new Get2faStatusUseCase(repository),
    regenerateBackupCodes: new RegenerateBackupCodesUseCase(repository, hash, logger),
    validate2fa: new Validate2faUseCase(repository, totp, hash, cache, logger),
  };
}

export function buildTwoFactorAuthComposition(
  prisma: PrismaService,
  cache: CacheService,
  logger: LoggerPort,
): BoundedContextComposition<TwoFactorAuthUseCases> {
  const useCases = buildTwoFactorAuthUseCases(prisma, cache, logger);

  return {
    useCases,
    routes: twoFactorAuthRoutes,
  };
}
