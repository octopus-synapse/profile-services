/**
 * User Management Request DTOs
 *
 * Uses createZodDto for unified TS types + validation + Swagger docs.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const AdminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER').optional(),
});

const AdminUpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
});

const AdminResetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

// ============================================================================
// DTOs
// ============================================================================

export class AdminCreateUserDto extends createZodDto(AdminCreateUserSchema) {}
export class AdminUpdateUserDto extends createZodDto(AdminUpdateUserSchema) {}
export class AdminResetPasswordDto extends createZodDto(AdminResetPasswordSchema) {}
