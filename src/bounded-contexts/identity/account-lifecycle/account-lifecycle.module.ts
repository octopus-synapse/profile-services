import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLogModule } from '@/bounded-contexts/platform/common/audit/audit-log.module';
// Shared providers
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { NestEventBusAdapter } from '../shared-kernel/adapters';
import type { EventBusPort } from '../shared-kernel/ports/event-bus.port';
// Outbound Adapters (Infrastructure)
import {
  AuditLoggerAdapter,
  BcryptPasswordHasher,
  ConfigVersionAdapter,
  DataExportRepository,
  PrismaAccountLifecycleRepository,
  PrismaConsentRepository,
} from './adapters';
import type { ConsentRepositoryPort, VersionConfigPort } from './modules';
// Controllers (Inbound Adapters)
// Use Cases (Application Services)
import {
  ACCEPT_CONSENT_USE_CASE,
  AcceptConsentController,
  AcceptConsentUseCase,
  CONSENT_REPOSITORY_PORT,
  CreateAccountController,
  CreateAccountUseCase,
  DeactivateAccountController,
  DeactivateAccountUseCase,
  DeleteAccountController,
  DeleteAccountUseCase,
  ExportDataController,
  GET_CONSENT_HISTORY_USE_CASE,
  GET_CONSENT_STATUS_USE_CASE,
  GetConsentHistoryController,
  GetConsentHistoryUseCase,
  GetConsentStatusController,
  GetConsentStatusUseCase,
  VERSION_CONFIG_PORT,
} from './modules';
// Ports (Symbols for DI)
import { CREATE_ACCOUNT_PORT, DEACTIVATE_ACCOUNT_PORT, DELETE_ACCOUNT_PORT } from './ports/inbound';
import { AUDIT_LOGGER_PORT, DATA_EXPORT_REPOSITORY_PORT } from './ports/outbound';
import type { AccountLifecycleRepositoryPort } from './ports/outbound/account-lifecycle-repository.port';
import type { AuditLoggerPort } from './ports/outbound/audit-logger.port';
import type { PasswordHasherPort } from './ports/outbound/password-hasher.port';

// Port symbols for outbound adapters
const ACCOUNT_REPOSITORY = Symbol('AccountLifecycleRepositoryPort');
const PASSWORD_HASHER = Symbol('PasswordHasherPort');
const EVENT_BUS = Symbol('EventBusPort');

@Module({
  imports: [PrismaModule, AuditLogModule, ConfigModule],
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
      ) => {
        return new CreateAccountUseCase(repository, passwordHasher, eventBus);
      },
      inject: [ACCOUNT_REPOSITORY, PASSWORD_HASHER, EVENT_BUS],
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
