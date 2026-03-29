/**
 * Environment Variables Validation
 *
 */

import { type EnvironmentVariables, validateEnv } from './schemas/env.schema';

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  return validateEnv(config);
}

// Re-export type for convenience
export type { EnvironmentVariables };
