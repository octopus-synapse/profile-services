import type { FeatureFlagKey, FlagRecord } from '../types';

export interface UpsertFlagInput {
  key: FeatureFlagKey;
  name: string;
  description: string | null;
  defaultEnabled: boolean;
  dependsOn: FeatureFlagKey[];
}

export interface UpdateFlagInput {
  enabled?: boolean;
  enabledForRoles?: string[];
}

export abstract class FeatureFlagRepositoryPort {
  abstract listAll(): Promise<FlagRecord[]>;
  /** @returns the row, or `null` when the key is unknown. */
  abstract findByKey(key: FeatureFlagKey): Promise<FlagRecord | null>;
  /** @throws FeatureFlagNotFoundException when the key is unknown (Q10 split). */
  abstract getByKey(key: FeatureFlagKey): Promise<FlagRecord>;
  abstract upsertFromRegistry(inputs: UpsertFlagInput[]): Promise<void>;
  abstract markDeprecated(keys: FeatureFlagKey[]): Promise<void>;
  abstract update(key: FeatureFlagKey, input: UpdateFlagInput): Promise<FlagRecord>;
}
