/**
 * Environment Variables Validation
 *
 */

import { type EnvironmentVariables, validateEnv } from '@/shared-kernel';

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  return validateEnv(config);
}

// Re-export type for convenience
export type { EnvironmentVariables };
