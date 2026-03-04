// Domain

// NestJS Module
export { AccountLifecycleModule } from './account-lifecycle.module';
// Adapters
export * from './adapters';
export * from './domain';
// Modules (Vertical Slices)
export * from './modules';
export type {
  CreateAccountCommand,
  CreateAccountPort,
  CreateAccountResult,
  DeactivateAccountCommand,
  DeactivateAccountPort,
  DeactivateAccountResult,
  DeleteAccountCommand,
  DeleteAccountPort,
  DeleteAccountResult,
} from './ports/inbound';
// Ports - separate value and type exports for Bun compatibility
export {
  CREATE_ACCOUNT_PORT,
  DEACTIVATE_ACCOUNT_PORT,
  DELETE_ACCOUNT_PORT,
  DELETION_CONFIRMATION_PHRASE,
} from './ports/inbound';
export type {
  AccountData,
  AccountLifecycleRepositoryPort,
  AuditLoggerPort,
  CreateAccountData,
  DataExportRepositoryPort,
  PasswordHasherPort,
} from './ports/outbound';
export {
  AUDIT_LOGGER_PORT,
  DATA_EXPORT_REPOSITORY_PORT,
} from './ports/outbound';
