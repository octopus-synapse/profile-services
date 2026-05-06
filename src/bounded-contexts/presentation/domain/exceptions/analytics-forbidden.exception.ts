/**
 * Presentation Bounded Context Exceptions
 *
 * Server-driven UI + analytics + event tracking infrastructure.
 */
import { ForbiddenException } from '@/shared-kernel/exceptions';

/**
 * F5.I.3 SKIP — redundant with `analytics.exceptions.ts ›
 * AnalyticsConsentRequiredException` (same `ANALYTICS_CONSENT_REQUIRED`
 * code). The analytics BC owns the consent envelope; this presentation
 * shadow is a leftover from the pre-split layout.
 */
export class AnalyticsForbiddenException extends ForbiddenException {
  override readonly code: string = 'ANALYTICS_CONSENT_REQUIRED';
  constructor() {
    super('Analytics tracking requires explicit user consent');
  }
}
