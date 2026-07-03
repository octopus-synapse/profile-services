/**
 * Market-relative coverage for a résumé: how well its skills cover the
 * in-demand skills of the user's declared target role. Encapsulates the
 * reads (target-role label + résumé/user skills) and the role-skills lookup,
 * so `ComputeReadinessUseCase` just asks for the number.
 *
 * Returns `null` when there's no target role (or its skills can't be
 * resolved) — the caller then falls back to the deterministic count-based
 * coverage.
 */
export abstract class TargetRoleCoveragePort {
  abstract computeCoverage(userId: string, resumeId: string): Promise<number | null>;
}
