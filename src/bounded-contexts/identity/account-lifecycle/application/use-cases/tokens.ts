/**
 * DI ports for account-lifecycle use-cases.
 *
 * Lives outside any controller file so the ConsentGuard (in shared-kernel)
 * can depend on these abstract classes without dragging in controller code
 * that itself imports JwtAuthGuard from shared-kernel — which would form a
 * cycle.
 */

import type {
  AcceptConsentInput,
  AcceptConsentOutput,
} from './accept-consent/accept-consent.schema';
import type {
  GetConsentHistoryInput,
  GetConsentHistoryOutput,
} from './get-consent-history/get-consent-history.schema';
import type {
  GetConsentStatusInput,
  GetConsentStatusOutput,
} from './get-consent-status/get-consent-status.schema';

export abstract class AcceptConsentUseCasePort {
  abstract execute(input: AcceptConsentInput): Promise<AcceptConsentOutput>;
}

export abstract class GetConsentStatusUseCasePort {
  abstract execute(input: GetConsentStatusInput): Promise<GetConsentStatusOutput>;
}

export abstract class GetConsentHistoryUseCasePort {
  abstract execute(input: GetConsentHistoryInput): Promise<GetConsentHistoryOutput>;
}
