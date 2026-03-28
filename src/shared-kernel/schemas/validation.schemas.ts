/**
 * Validation Schemas (Zod)
 *
 * Single source of truth for validation logic.
 * Used by DTOs via nestjs-zod or ZodValidationPipe.
 *
 * Architecture:
 * - Primitives (email, password) live here
 * - Complex domain validations live in bounded contexts
 * - Role definitions come from authorization/roles.ts
 */
import { z } from 'zod';
import { getAllRoleIds } from '@/shared-kernel/authorization/roles';

// ============================================================================
// Primitives
// ============================================================================

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .min(3, 'Email must be at least 3 characters')
  .max(255, 'Email must not exceed 255 characters');

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[@$!%*?&#]/, 'Password must contain at least one special character (@$!%*?&#)');

export const FullNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters');

// ============================================================================
// Roles (derived from authorization system)
// ============================================================================

/**
 * Role ID validation schema.
 * Dynamically generated from ROLES object in authorization/roles.ts.
 *
 * Valid values: ['role_user', 'role_admin']
 */
export const RoleIdSchema = z.enum(getAllRoleIds() as [string, ...string[]]);

export type RoleId = z.infer<typeof RoleIdSchema>;
