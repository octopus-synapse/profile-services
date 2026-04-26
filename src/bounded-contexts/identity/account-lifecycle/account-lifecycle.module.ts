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
import { AuthenticationModule } from '../authentication/authentication.module';
import { TokenGeneratorPort } from '../authentication/domain/ports';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import { EventBusPort } from '../shared-kernel/ports/event-bus.port';

// Application Ports

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
  DeactivateAccountController,
  DeleteAccountController,
  ExportDataController,
  GetConsentHistoryController,
  GetConsentStatusController,
} from './infrastructure/controllers';

@Module({
  imports: [PrismaModule, AuditLogModule, ConfigModule, AuthenticationModule],
  controllers: [
    CreateAccountController,
    DeactivateAccountController,
    DeleteAccountController,
    ExportDataController,
    AcceptConsentController,
    GetConsentStatusController,
    GetConsentHistoryController,
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
      ) => {
        return new CreateAccountUseCase(
          repository,
          passwordHasher,
          eventBus,
          tokenGenerator,
          acceptConsent,
          versionConfig,
        );
      },
      inject: [
        AccountLifecycleRepositoryPort,
        PasswordHasherPort,
        EventBusPort,
        TokenGeneratorPort,
        AcceptConsentUseCasePort,
        VersionConfigPort,
      ],
    },
    {
      provide: DeactivateAccountPort,
      useFactory: (repository: AccountLifecycleRepositoryPort, eventBus: EventBusPort) => {
        return new DeactivateAccountUseCase(repository, eventBus);
      },
      inject: [AccountLifecycleRepositoryPort, EventBusPort],
    },
    {
      provide: DeleteAccountPort,
      useFactory: (repository: AccountLifecycleRepositoryPort, eventBus: EventBusPort) => {
        return new DeleteAccountUseCase(repository, eventBus);
      },
      inject: [AccountLifecycleRepositoryPort, EventBusPort],
    },
    {
      provide: AcceptConsentUseCasePort,
      useFactory: (
        repository: ConsentRepositoryPort,
        versionConfig: VersionConfigPort,
        auditLogger: AuditLoggerPort,
      ) => {
        return new AcceptConsentUseCase(repository, versionConfig, auditLogger);
      },
      inject: [ConsentRepositoryPort, VersionConfigPort, AuditLoggerPort],
    },
    {
      provide: GetConsentStatusUseCasePort,
      useFactory: (repository: ConsentRepositoryPort, versionConfig: VersionConfigPort) => {
        return new GetConsentStatusUseCase(repository, versionConfig);
      },
      inject: [ConsentRepositoryPort, VersionConfigPort],
    },
    {
      provide: GetConsentHistoryUseCasePort,
      useFactory: (repository: ConsentRepositoryPort) => {
        return new GetConsentHistoryUseCase(repository);
      },
      inject: [ConsentRepositoryPort],
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
