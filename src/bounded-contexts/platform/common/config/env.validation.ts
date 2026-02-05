/**
 * Environment Variables Validation
 *
 * Uses profile-contracts for validation.
 * No class-validator, no Zod here - just imports.
 */

import {
  validateEnv,
  type EnvironmentVariables,
} from '@/shared-kernel';

/**
 * Validates environment variables using profile-contracts
 */
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  return validateEnv(config);
}

// Re-export type for convenience
export type { EnvironmentVariables };
