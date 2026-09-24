/**
 * Pure-TS wiring for the identity/account-lifecycle BC. Zero `@nestjs/*`
 * imports. The Nest module shell consumes `buildAccountLifecycleUseCases`
 * via `useFactory`, the Elysia path will use the same composition.
 *
 * Cross-BC: `createSession` (authentication BC) is required to issue a
 * cookie session right after signup — pass it in from outside. The
 * cookie alone carries auth; token generation has been removed from this
 * BC after the P2 hardening that stopped exposing bearer tokens in the
 * signup response body.
 */

import type { CreateSessionPort } from '@/bounded-contexts/identity/authentication/application/ports/create-session.port';
import type { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import { PrismaAuthenticationRepository } from '../authentication/infrastructure/adapters/prisma-authentication.repository';
import { PrismaEmailVerificationRepository } from '../email-verification/infrastructure/adapters/persistence/email-verification.repository';
import { SessionInvalidationAdapter } from '../password-management/infrastructure/adapters/external-services/session-invalidation.adapter';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import { accountLifecycleRoutes } from './account-lifecycle.routes';
import { AccountLifecycleUseCases } from './application/ports/account-lifecycle.port';
import {
  AcceptConsentUseCase,
  type AccountDeletionCodeEmailPort,
  CompleteUnverifiedAccountUseCase,
  ConfirmAccountDeletionUseCase,
  CreateAccountUseCase,
  DeactivateAccountUseCase,
  GetConsentHistoryUseCase,
  GetConsentStatusUseCase,
  IdentifyAccountUseCase,
  RequestAccountDeletionUseCase,
} from './application/use-cases';
import { ExportDataUseCase } from './application/use-cases/export-data/export-data.use-case';
import {
  AuditLoggerAdapter,
  BcryptPasswordHasher,
  ConfigVersionAdapter,
  DataExportRepository,
  PrismaAccountLifecycleRepository,
  PrismaConsentRepository,
  SignedRegistrationTokenVerifier,
} from './infrastructure/adapters';

export { AccountLifecycleUseCases };

export function buildAccountLifecycleUseCases(
  prisma: PrismaService,
  auditLog: AuditLogService,
  config: ConfigPort,
  eventBus: EventBusPort,
  createSession: CreateSessionPort,
  // Real platform EmailService satisfies this structurally — used to deliver
  // the account-deletion confirmation code (two-step flow).
  emailService: AccountDeletionCodeEmailPort,
  cache: CacheService,
  logger: LoggerPort,
): AccountLifecycleUseCases {
  const repository = new PrismaAccountLifecycleRepository(prisma);
  // P1-#A1-17: cost comes from validated `EnvConfigSchema.BCRYPT_COST`
  // (min(10).default(12)) instead of unchecked `process.env`.
  const passwordHasher = new BcryptPasswordHasher(config.env.BCRYPT_COST);
  const dataExportRepo = new DataExportRepository(prisma);
  const auditLogger = new AuditLoggerAdapter(auditLog, logger);
  const consentRepo = new PrismaConsentRepository(prisma, logger);
  const versionConfig = new ConfigVersionAdapter(config);
  // Reuse the shared 6-digit-code engine (same EmailVerificationToken table) as
  // the deletion code store — structural conformance, no duplicate adapter.
  const codeStore = new PrismaEmailVerificationRepository(prisma);

  const acceptConsent = new AcceptConsentUseCase(consentRepo, versionConfig, auditLogger, logger);
  const getConsentStatus = new GetConsentStatusUseCase(consentRepo, versionConfig, logger);
  const getConsentHistory = new GetConsentHistoryUseCase(consentRepo);
  const createAccount = new CreateAccountUseCase(
    repository,
    passwordHasher,
    eventBus,
    acceptConsent,
    versionConfig,
    // Same secret the email-verification BC signs with (shared-kernel helper).
    new SignedRegistrationTokenVerifier(config.env.JWT_SECRET),
    logger,
  );
  const completeUnverifiedAccount = new CompleteUnverifiedAccountUseCase(
    repository,
    passwordHasher,
    new SignedRegistrationTokenVerifier(config.env.JWT_SECRET),
    acceptConsent,
    versionConfig,
    new SessionInvalidationAdapter(
      cache,
      prisma,
      Math.max(
        Number(config.getOrDefault<number>('SESSION_EXPIRY_DAYS', 7)) || 7,
        Number(config.getOrDefault<number>('PERSISTENT_SESSION_EXPIRY_DAYS', 30)) || 30,
      ),
    ),
    new PrismaAuthenticationRepository(prisma, cache),
    eventBus,
    logger,
  );
  const identifyAccount = new IdentifyAccountUseCase(repository);
  const deactivateAccount = new DeactivateAccountUseCase(repository, eventBus, logger);
  const requestAccountDeletion = new RequestAccountDeletionUseCase(
    repository,
    passwordHasher,
    codeStore,
    emailService,
    config.env,
    logger,
  );
  const confirmAccountDeletion = new ConfirmAccountDeletionUseCase(
    repository,
    codeStore,
    eventBus,
    logger,
  );
  const exportData = new ExportDataUseCase(dataExportRepo, auditLogger, logger);

  return {
    createAccount,
    completeUnverifiedAccount,
    identifyAccount,
    createSession,
    deactivateAccount,
    requestAccountDeletion,
    confirmAccountDeletion,
    acceptConsent,
    getConsentStatus,
    getConsentHistory,
    exportData,
  };
}

export function buildAccountLifecycleComposition(
  prisma: PrismaService,
  auditLog: AuditLogService,
  config: ConfigPort,
  eventBus: EventBusPort,
  createSession: CreateSessionPort,
  emailService: AccountDeletionCodeEmailPort,
  cache: CacheService,
  logger: LoggerPort,
): BoundedContextComposition<AccountLifecycleUseCases> {
  const useCases = buildAccountLifecycleUseCases(
    prisma,
    auditLog,
    config,
    eventBus,
    createSession,
    emailService,
    cache,
    logger,
  );

  return {
    useCases,
    routes: accountLifecycleRoutes,
  };
}
