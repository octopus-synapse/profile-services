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
import { TOKEN_GENERATOR_PORT, type TokenGeneratorPort } from '../authentication/domain/ports';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
// Application Ports
import {
  CREATE_ACCOUNT_PORT,
  DEACTIVATE_ACCOUNT_PORT,
  DELETE_ACCOUNT_PORT,
} from './application/ports';
// Application Use Cases
import {
  AcceptConsentUseCase,
  CreateAccountUseCase,
  DeactivateAccountUseCase,
  DeleteAccountUseCase,
  GetConsentHistoryUseCase,
  GetConsentStatusUseCase,
} from './application/use-cases';
// Domain Ports
import {
  type AccountLifecycleRepositoryPort,
  AUDIT_LOGGER_PORT,
  type AuditLoggerPort,
  CONSENT_REPOSITORY_PORT,
  type ConsentRepositoryPort,
  DATA_EXPORT_REPOSITORY_PORT,
  type PasswordHasherPort,
  VERSION_CONFIG_PORT,
  type VersionConfigPort,
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
  ACCEPT_CONSENT_USE_CASE,
  AcceptConsentController,
  CreateAccountController,
  DeactivateAccountController,
  DeleteAccountController,
  ExportDataController,
  GET_CONSENT_HISTORY_USE_CASE,
  GET_CONSENT_STATUS_USE_CASE,
  GetConsentHistoryController,
  GetConsentStatusController,
} from './infrastructure/controllers';

// Port symbols for outbound adapters
const ACCOUNT_REPOSITORY = Symbol('AccountLifecycleRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const EVENT_BUS = Symbol('EventBusPort');

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
    {
      provide: ACCOUNT_REPOSITORY,
      useClass: PrismaAccountLifecycleRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: EVENT_BUS,
      useClass: NestEventBusAdapter,
    },
    {
      provide: DATA_EXPORT_REPOSITORY_PORT,
      useClass: DataExportRepository,
    },
    {
      provide: AUDIT_LOGGER_PORT,
      useClass: AuditLoggerAdapter,
    },
    {
      provide: CONSENT_REPOSITORY_PORT,
      useClass: PrismaConsentRepository,
    },
    {
      provide: VERSION_CONFIG_PORT,
      useClass: ConfigVersionAdapter,
    },

    // Use Cases (bound to inbound ports)
    {
      provide: CREATE_ACCOUNT_PORT,
      useFactory: (
        repository: AccountLifecycleRepositoryPort,
        passwordHasher: PasswordHasherPort,
        eventBus: EventBusPort,
        tokenGenerator: TokenGeneratorPort,
      ) => {
        return new CreateAccountUseCase(repository, passwordHasher, eventBus, tokenGenerator);
      },
      inject: [ACCOUNT_REPOSITORY, PASSWORD_HASHER, EVENT_BUS, TOKEN_GENERATOR_PORT],
    },
    {
      provide: DEACTIVATE_ACCOUNT_PORT,
      useFactory: (repository: AccountLifecycleRepositoryPort, eventBus: EventBusPort) => {
        return new DeactivateAccountUseCase(repository, eventBus);
      },
      inject: [ACCOUNT_REPOSITORY, EVENT_BUS],
    },
    {
      provide: DELETE_ACCOUNT_PORT,
      useFactory: (repository: AccountLifecycleRepositoryPort, eventBus: EventBusPort) => {
        return new DeleteAccountUseCase(repository, eventBus);
      },
      inject: [ACCOUNT_REPOSITORY, EVENT_BUS],
    },
    {
      provide: ACCEPT_CONSENT_USE_CASE,
      useFactory: (
        repository: ConsentRepositoryPort,
        versionConfig: VersionConfigPort,
        auditLogger: AuditLoggerPort,
      ) => {
        return new AcceptConsentUseCase(repository, versionConfig, auditLogger);
      },
      inject: [CONSENT_REPOSITORY_PORT, VERSION_CONFIG_PORT, AUDIT_LOGGER_PORT],
    },
    {
      provide: GET_CONSENT_STATUS_USE_CASE,
      useFactory: (repository: ConsentRepositoryPort, versionConfig: VersionConfigPort) => {
        return new GetConsentStatusUseCase(repository, versionConfig);
      },
      inject: [CONSENT_REPOSITORY_PORT, VERSION_CONFIG_PORT],
    },
    {
      provide: GET_CONSENT_HISTORY_USE_CASE,
      useFactory: (repository: ConsentRepositoryPort) => {
        return new GetConsentHistoryUseCase(repository);
      },
      inject: [CONSENT_REPOSITORY_PORT],
    },
  ],
  exports: [
    CREATE_ACCOUNT_PORT,
    DEACTIVATE_ACCOUNT_PORT,
    DELETE_ACCOUNT_PORT,
    ACCOUNT_REPOSITORY,
    DATA_EXPORT_REPOSITORY_PORT,
  ],
})
export class AccountLifecycleModule {}
