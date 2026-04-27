/**
 * Bundle token for the account-lifecycle BC. Doubles as the
 * TypeScript shape and the Nest DI token. Each inbound port keeps its
 * own provider in `account-lifecycle.module.ts`; the bundle is
 * aggregated via `useFactory` so route handlers receive a single typed
 * dependency.
 */

import type {
  AcceptConsentUseCasePort,
  GetConsentHistoryUseCasePort,
  GetConsentStatusUseCasePort,
} from '../use-cases/tokens';
import type { CreateAccountPort } from './create-account.port';
import type { DeactivateAccountPort } from './deactivate-account.port';
import type { DeleteAccountPort } from './delete-account.port';

export abstract class AccountLifecycleUseCases {
  abstract readonly createAccount: CreateAccountPort;
  abstract readonly deactivateAccount: DeactivateAccountPort;
  abstract readonly deleteAccount: DeleteAccountPort;
  abstract readonly acceptConsent: AcceptConsentUseCasePort;
  abstract readonly getConsentStatus: GetConsentStatusUseCasePort;
  abstract readonly getConsentHistory: GetConsentHistoryUseCasePort;
}
