/**
 * DI tokens for account-lifecycle use-cases.
 *
 * Lives outside any controller file so the ConsentGuard (in shared-kernel)
 * can depend on the symbol without dragging in controller code that itself
 * imports JwtAuthGuard from shared-kernel — which would form a cycle.
 */
export const ACCEPT_CONSENT_USE_CASE = Symbol('AcceptConsentUseCase');
export const GET_CONSENT_STATUS_USE_CASE = Symbol('GetConsentStatusUseCase');
export const GET_CONSENT_HISTORY_USE_CASE = Symbol('GetConsentHistoryUseCase');
