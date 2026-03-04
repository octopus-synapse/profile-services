// Use Cases

export {
  ACCEPT_CONSENT_USE_CASE,
  AcceptConsentController,
} from './accept-consent/accept-consent.controller';
// DTOs (types/interfaces)
export type {
  AcceptConsentInput,
  AcceptConsentOutput,
} from './accept-consent/accept-consent.dto';
export type { ConsentRepositoryPort } from './accept-consent/accept-consent.port';
export { CONSENT_REPOSITORY_PORT } from './accept-consent/accept-consent.port';
export type { VersionConfigPort } from './accept-consent/accept-consent.use-case';
export {
  AcceptConsentUseCase,
  VERSION_CONFIG_PORT,
} from './accept-consent/accept-consent.use-case';
// Controllers
export { CreateAccountController } from './create-account/create-account.controller';
// DTOs (classes)
export {
  CreateAccountDto,
  CreateAccountResponseDto,
} from './create-account/create-account.dto';
export {
  ACCOUNT_REPOSITORY,
  CreateAccountUseCase,
  EVENT_BUS,
  PASSWORD_HASHER,
} from './create-account/create-account.use-case';
export { DeactivateAccountController } from './deactivate-account/deactivate-account.controller';
export {
  DeactivateAccountDto,
  DeactivateAccountResponseDto,
} from './deactivate-account/deactivate-account.dto';
export { DeactivateAccountUseCase } from './deactivate-account/deactivate-account.use-case';
export { DeleteAccountController } from './delete-account/delete-account.controller';
export {
  DeleteAccountDto,
  DeleteAccountResponseDto,
} from './delete-account/delete-account.dto';
export { DeleteAccountUseCase } from './delete-account/delete-account.use-case';
export { ExportDataController } from './export-data/export-data.controller';
export { ExportDataResponseDto } from './export-data/export-data.dto';
export { ExportDataUseCase } from './export-data/export-data.use-case';
export {
  GET_CONSENT_HISTORY_USE_CASE,
  GetConsentHistoryController,
} from './get-consent-history/get-consent-history.controller';
export type {
  ConsentHistoryItem,
  GetConsentHistoryInput,
  GetConsentHistoryOutput,
} from './get-consent-history/get-consent-history.dto';
export { GetConsentHistoryUseCase } from './get-consent-history/get-consent-history.use-case';
export {
  GET_CONSENT_STATUS_USE_CASE,
  GetConsentStatusController,
} from './get-consent-status/get-consent-status.controller';
export type {
  GetConsentStatusInput,
  GetConsentStatusOutput,
} from './get-consent-status/get-consent-status.dto';
export { GetConsentStatusUseCase } from './get-consent-status/get-consent-status.use-case';
