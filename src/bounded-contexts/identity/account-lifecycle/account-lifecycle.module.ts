/**
 * Account Lifecycle Module
 *
 * Bounded Context for account lifecycle management.
 * Follows Hexagonal Architecture with ports and adapters.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLogModule } from '@/bounded-contexts/platform/common/audit/audit-log.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { AuthenticationModule } from '../authentication/authentication.module';
import { TokenGeneratorPort } from '../authentication/domain/ports';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import { EventBusPort } from '../shared-kernel/ports/event-bus.port';
import { accountLifecycleRoutes } from './account-lifecycle.routes';

// Application Ports

import { AccountLifecycleUseCases } from './application/ports/account-lifecycle.port';
import { CreateAccountPort } from './application/ports/create-account.port';
import { DeactivateAccountPort } from './application/ports/deactivate-account.port';
import { DeleteAccountPort } from './application/ports/delete-account.port';
// Application Use Cases
import {
  AcceptConsentUseCase,
  CreateAccountUseCase,
  DeactivateAccountUseCase,
  DeleteAccountUseCase,
  GetConsentHistoryUseCase,
  GetConsentStatusUseCase,
} from './application/use-cases';
import {
  AcceptConsentUseCasePort,
  GetConsentHistoryUseCasePort,
  GetConsentStatusUseCasePort,
} from './application/use-cases/tokens';
// Domain Ports
import {
  AccountLifecycleRepositoryPort,
  AuditLoggerPort,
  ConsentRepositoryPort,
  DataExportRepositoryPort,
  PasswordHasherPort,
  VersionConfigPort,
} from './domain/ports';
// Infrastructure Adapters
import {
  AuditLoggerAdapter,
  BcryptPasswordHasher,
  ConfigVersionAdapter,
  DataExportRepository,
  PrismaAccountLifecycleRepository,
  PrismaConsentRepository,
} from './infrastructure/adapters';
// Infrastructure Controllers
import {
  AcceptConsentController,
  CreateAccountController,
  ExportDataController,
  GetConsentHistoryController,
  GetConsentStatusController,
} from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, AuditLogModule, ConfigModule, AuthenticationModule],
  controllers: [
    // Legacy controllers (see account-lifecycle.routes.ts header for why):
    // - CreateAccount: cookie + IP/user-agent capture.
    // - ExportData: needs req.ip for the audit log.
    // - AcceptConsent / GetConsentStatus / GetConsentHistory: rely on
    //   @SkipTosCheck()/@AllowUnverifiedEmail() to bypass global guards.
    CreateAccountController,
    ExportDataController,
    AcceptConsentController,
    GetConsentStatusController,
    GetConsentHistoryController,
    ...synthesizeRouteControllers(AccountLifecycleUseCases, accountLifecycleRoutes),
  ],
  providers: [
    // Outbound Adapters
    { provide: AccountLifecycleRepositoryPort, useClass: PrismaAccountLifecycleRepository },
    { provide: PasswordHasherPort, useClass: BcryptPasswordHasher },
    { provide: EventBusPort, useClass: NestEventBusAdapter },
    { provide: DataExportRepositoryPort, useClass: DataExportRepository },
    { provide: AuditLoggerPort, useClass: AuditLoggerAdapter },
    { provide: ConsentRepositoryPort, useClass: PrismaConsentRepository },
    { provide: VersionConfigPort, useClass: ConfigVersionAdapter },

    // Use Cases (bound to inbound ports)
    {
      provide: CreateAccountPort,
      useFactory: (
        repository: AccountLifecycleRepositoryPort,
        passwordHasher: PasswordHasherPort,
        eventBus: EventBusPort,
        tokenGenerator: TokenGeneratorPort,
        acceptConsent: AcceptConsentUseCase,
        versionConfig: VersionConfigPort,
        logger: LoggerPort,
      ) => {
        return new CreateAccountUseCase(
          repository,
          passwordHasher,
          eventBus,
          tokenGenerator,
          acceptConsent,
          versionConfig,
          logger,
        );
      },
      inject: [
        AccountLifecycleRepositoryPort,
        PasswordHasherPort,
        EventBusPort,
        TokenGeneratorPort,
        AcceptConsentUseCasePort,
        VersionConfigPort,
        LoggerPort,
      ],
    },
    {
      provide: DeactivateAccountPort,
      useFactory: (
        repository: AccountLifecycleRepositoryPort,
        eventBus: EventBusPort,
        logger: LoggerPort,
      ) => {
        return new DeactivateAccountUseCase(repository, eventBus, logger);
      },
      inject: [AccountLifecycleRepositoryPort, EventBusPort, LoggerPort],
    },
    {
      provide: DeleteAccountPort,
      useFactory: (
        repository: AccountLifecycleRepositoryPort,
        eventBus: EventBusPort,
        logger: LoggerPort,
      ) => {
        return new DeleteAccountUseCase(repository, eventBus, logger);
      },
      inject: [AccountLifecycleRepositoryPort, EventBusPort, LoggerPort],
    },
    {
      provide: AcceptConsentUseCasePort,
      useFactory: (
        repository: ConsentRepositoryPort,
        versionConfig: VersionConfigPort,
        auditLogger: AuditLoggerPort,
        logger: LoggerPort,
      ) => {
        return new AcceptConsentUseCase(repository, versionConfig, auditLogger, logger);
      },
      inject: [ConsentRepositoryPort, VersionConfigPort, AuditLoggerPort, LoggerPort],
    },
    {
      provide: GetConsentStatusUseCasePort,
      useFactory: (
        repository: ConsentRepositoryPort,
        versionConfig: VersionConfigPort,
        logger: LoggerPort,
      ) => {
        return new GetConsentStatusUseCase(repository, versionConfig, logger);
      },
      inject: [ConsentRepositoryPort, VersionConfigPort, LoggerPort],
    },
    {
      provide: GetConsentHistoryUseCasePort,
      useFactory: (repository: ConsentRepositoryPort) => {
        return new GetConsentHistoryUseCase(repository);
      },
      inject: [ConsentRepositoryPort],
    },

    // Aggregated bundle for the route synthesizer. Each use-case stays
    // independently provided above; the bundle just collects them so
    // `synthesizeRouteControllers` has a single DI token to inject.
    {
      provide: AccountLifecycleUseCases,
      useFactory: (
        createAccount: CreateAccountPort,
        deactivateAccount: DeactivateAccountPort,
        deleteAccount: DeleteAccountPort,
        acceptConsent: AcceptConsentUseCasePort,
        getConsentStatus: GetConsentStatusUseCasePort,
        getConsentHistory: GetConsentHistoryUseCasePort,
      ): AccountLifecycleUseCases => ({
        createAccount,
        deactivateAccount,
        deleteAccount,
        acceptConsent,
        getConsentStatus,
        getConsentHistory,
      }),
      inject: [
        CreateAccountPort,
        DeactivateAccountPort,
        DeleteAccountPort,
        AcceptConsentUseCasePort,
        GetConsentStatusUseCasePort,
        GetConsentHistoryUseCasePort,
      ],
    },
  ],
  exports: [
    CreateAccountPort,
    DeactivateAccountPort,
    DeleteAccountPort,
    AccountLifecycleRepositoryPort,
    DataExportRepositoryPort,
    // Exported so ConsentGuard (registered as APP_GUARD in app.module)
    // can inject the use-case and enforce LGPD consent on every request.
    GetConsentStatusUseCasePort,
  ],
})
export class AccountLifecycleModule {}
