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
}
