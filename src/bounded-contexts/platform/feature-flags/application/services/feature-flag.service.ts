import { FeatureFlagDisabledException } from '../../domain/exceptions/feature-flag.exceptions';
import type { FlagEvaluationSnapshot } from '../../domain/types';
import type { RoleLookupPort } from '../ports/role-lookup.port';
import { EvaluateFlagsUseCase } from '../use-cases/evaluate-flags.use-case';

/**
 * Public API for other bounded contexts to check feature flags imperatively.
 * Resolves the calling user's roles (via `RoleLookupPort`) then delegates
 * to the cached evaluator.
 *
 * Example:
 *   if (await flags.isEnabled('resumes.export.pdf', userId)) { ... }
 */
export class FeatureFlagService {
  constructor(
    private readonly evaluator: EvaluateFlagsUseCase,
    private readonly roles: RoleLookupPort,
  ) {}

  async isEnabled(key: string, userId: string | null): Promise<boolean> {
    const roles = userId ? await this.roles.rolesFor(userId) : [];
    return this.evaluator.isEnabled(key, roles);
  }

  async snapshotFor(userId: string | null): Promise<FlagEvaluationSnapshot> {
    const roles = userId ? await this.roles.rolesFor(userId) : [];
    return this.evaluator.execute(roles);
  }

  /**
   * Endpoint-level guard: throws `FeatureFlagDisabledException` (404)
   * when the flag is off for the caller. The 404 is intentional —
   * routes hidden behind an unreleased flag should be invisible to
   * clients without the flag enabled.
   */
  async assertEnabled(key: string, userId: string | null): Promise<void> {
    const enabled = await this.isEnabled(key, userId);
    if (!enabled) {
      throw new FeatureFlagDisabledException();
    }
  }
}
