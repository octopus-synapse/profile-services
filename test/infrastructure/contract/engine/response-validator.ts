import { analyzeDrift, type Drift } from '../../../static-analysis/shared/response-drift-analyzer';
import type { Persona } from './session-pool';

export type { Drift };
export { analyzeDrift };

export type AuthMismatchDrift = {
  readonly kind: 'auth-mismatch';
  readonly path: readonly string[];
  readonly persona: Persona;
  readonly status: number;
};

export type ReportDrift = Drift | AuthMismatchDrift;

export interface RouteDriftReport {
  readonly route: string;
  readonly status: number;
  readonly persona: Persona;
  readonly drifts: readonly ReportDrift[];
  readonly error?: string;
}
