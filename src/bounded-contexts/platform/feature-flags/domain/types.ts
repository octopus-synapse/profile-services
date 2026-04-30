/**
 * Shared types for the feature-flags bounded context.
 * Kept framework-free so the domain layer has zero NestJS dependency.
 */

export type FeatureFlagKey = string;

export interface FlagDefinition {
  readonly key: FeatureFlagKey;
  readonly name: string;
  readonly description?: string;
  readonly defaultEnabled?: boolean;
  readonly dependsOn: readonly FeatureFlagKey[];
}

export interface FlagRecord {
  key: FeatureFlagKey;
  name: string;
  description: string | null;
  enabled: boolean;
  enabledForRoles: string[];
  deprecated: boolean;
  dependsOn: FeatureFlagKey[];
}

export interface FlagEvaluationSnapshot {
  [key: string]: boolean;
}

export interface FlagImpactTree {
  key: FeatureFlagKey;
  children: FlagImpactTree[];
}
