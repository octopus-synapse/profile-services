/**
 * Environment Variables Validation
 *
 * Uses profile-contracts for validation.
 */

import { type EnvironmentVariables, validateEnv } from '@/shared-kernel';

/**
 * Validates environment variables using profile-contracts
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  return validateEnv(config);
}

// Re-export type for convenience
export type { EnvironmentVariables };
