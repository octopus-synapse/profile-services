/**
 * Bundle token for the account-lifecycle BC. Doubles as the
 * TypeScript shape and the Nest DI token. Each inbound port keeps its
 * own provider in `account-lifecycle.module.ts`; the bundle is
 * aggregated via `useFactory` so route handlers receive a single typed
 * dependency.
 *
 * Cross-BC consumers (`createSession` lives in the authentication BC)
 * are surfaced here as well: the route handler that signs up users
 * needs to issue a session cookie immediately after creation, and
 * `ExportDataUseCase` is plain class today (no port) — both are
 * exposed through the bundle so `synthesizeRouteControllers` only ever
 * has to inject one DI token.
 */

import type { CreateSessionPort } from '../../../authentication/application/ports/create-session.port';
import type { ExportDataUseCase } from '../use-cases/export-data/export-data.use-case';
import type {
  AcceptConsentUseCasePort,
  GetConsentHistoryUseCasePort,
  GetConsentStatusUseCasePort,
} from '../use-cases/tokens';
import type { ConfirmAccountDeletionPort } from './confirm-account-deletion.port';
import type { CreateAccountPort } from './create-account.port';
import type { DeactivateAccountPort } from './deactivate-account.port';
import type { RequestAccountDeletionPort } from './request-account-deletion.port';

export abstract class AccountLifecycleUseCases {
  abstract readonly createAccount: CreateAccountPort;
  abstract readonly createSession: CreateSessionPort;
  abstract readonly deactivateAccount: DeactivateAccountPort;
  abstract readonly requestAccountDeletion: RequestAccountDeletionPort;
  abstract readonly confirmAccountDeletion: ConfirmAccountDeletionPort;
  abstract readonly acceptConsent: AcceptConsentUseCasePort;
  abstract readonly getConsentStatus: GetConsentStatusUseCasePort;
  abstract readonly getConsentHistory: GetConsentHistoryUseCasePort;
  abstract readonly exportData: ExportDataUseCase;
}
