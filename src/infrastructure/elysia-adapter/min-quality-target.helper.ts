/**
 * Resolve what the `min-quality` gate should check for a request, from
 * the route's guard declaration:
 *
 *   guards: [{ id: 'min-quality', metadata: { min: 50, resumeParam: 'resumeId' } }]
 *
 * - `min` — the quality threshold; routes without one keep the historical
 *   default (70), so the metadata-less auto-apply routes are unchanged.
 * - `resumeParam` — the route param naming the resume to gate; without
 *   one the gate falls back to the caller's primary resume (also the
 *   historical behaviour).
 */

import type { DomainGateContext } from './domain-gate-guard.stage';

export const DEFAULT_MIN_QUALITY_SCORE = 70;

export type MinQualityTarget = {
  min: number;
  /** Resume id taken from the route params, or null → primary resume. */
  resumeIdFromRoute: string | null;
};

export function resolveMinQualityTarget(gate: DomainGateContext): MinQualityTarget {
  const metadata = gate.metadata ?? {};
  const declaredMin = metadata.min;
  const min =
    typeof declaredMin === 'number' && Number.isFinite(declaredMin)
      ? declaredMin
      : DEFAULT_MIN_QUALITY_SCORE;

  const resumeParam = metadata.resumeParam;
  const raw = typeof resumeParam === 'string' ? gate.params[resumeParam] : undefined;
  const resumeIdFromRoute = typeof raw === 'string' && raw.length > 0 ? raw : null;

  return { min, resumeIdFromRoute };
}
