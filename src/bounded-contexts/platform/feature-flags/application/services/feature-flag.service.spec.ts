/**
 * FeatureFlagService — `assertEnabled` gate coverage.
 *
 * The 404 surface is intentional: routes hidden behind an unreleased
 * flag should be invisible (not 403/Forbidden) to clients without the
 * flag enabled.
 */

import { describe, expect, it, mock } from 'bun:test';
import { FeatureFlagDisabledException } from '../../domain/exceptions/feature-flag.exceptions';
import type { RoleLookupPort } from '../ports/role-lookup.port';
import type { EvaluateFlagsUseCase } from '../use-cases/evaluate-flags.use-case';
import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService — assertEnabled', () => {
  it('throws FeatureFlagDisabledException when flag is off for caller', async () => {
    const evaluator = {
      isEnabled: mock(() => Promise.resolve(false)),
      execute: mock(() => Promise.resolve({})),
    } as unknown as EvaluateFlagsUseCase;
    const roles = { rolesFor: mock(() => Promise.resolve([])) } as unknown as RoleLookupPort;
    const service = new FeatureFlagService(evaluator, roles);

    await expect(service.assertEnabled('flag.hidden', 'user-1')).rejects.toThrow(
      FeatureFlagDisabledException,
    );
  });

  it('resolves silently when flag is enabled', async () => {
    const evaluator = {
      isEnabled: mock(() => Promise.resolve(true)),
      execute: mock(() => Promise.resolve({})),
    } as unknown as EvaluateFlagsUseCase;
    const roles = { rolesFor: mock(() => Promise.resolve(['admin'])) } as unknown as RoleLookupPort;
    const service = new FeatureFlagService(evaluator, roles);

    await expect(service.assertEnabled('flag.live', 'user-1')).resolves.toBeUndefined();
  });
});
