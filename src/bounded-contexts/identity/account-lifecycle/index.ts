// Domain

// NestJS Module
export { AccountLifecycleModule } from './account-lifecycle.module';
// Adapters
export * from './adapters';
export * from './domain';
// Modules (Vertical Slices)
export * from './modules';
// Ports - use combined export style to avoid isolatedModules issues
export {
  CREATE_ACCOUNT_PORT,
  type CreateAccountCommand,
  type CreateAccountPort,
  type CreateAccountResult,
  DEACTIVATE_ACCOUNT_PORT,
  DELETE_ACCOUNT_PORT,
  DELETION_CONFIRMATION_PHRASE,
  type DeactivateAccountCommand,
  type DeactivateAccountPort,
  type DeactivateAccountResult,
  type DeleteAccountCommand,
  type DeleteAccountPort,
  type DeleteAccountResult,
} from './ports/inbound';
export {
  type AccountData,
  type AccountLifecycleRepositoryPort,
  AUDIT_LOGGER_PORT,
  type AuditLoggerPort,
  type CreateAccountData,
  DATA_EXPORT_REPOSITORY_PORT,
  type DataExportRepositoryPort,
  type PasswordHasherPort,
} from './ports/outbound';
