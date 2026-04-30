/**
 * Null-object stand-in for `FeatureFlagService`. Bootstrap uses this
 * when the Redis-backed flag cache isn't available — every feature
 * defaults to OFF, snapshots are empty.
 *
 * Replaces the cross-BC `flags: {} as never` stubs in the Elysia
 * bootstrap. Production swaps in the real `FeatureFlagService` once
 * the feature-flags BC's `RedisFlagCache` + `SseFlagStream` are
 * instantiated.
 */

import type { FlagEvaluationSnapshot } from '@/bounded-contexts/platform/feature-flags/domain/types';

export class NullFeatureFlagsAdapter {
  async isEnabled(_key: string, _userId: string | null): Promise<boolean> {
    return false;
  }

  async snapshotFor(_userId: string | null): Promise<FlagEvaluationSnapshot> {
    return {};
  }
}
