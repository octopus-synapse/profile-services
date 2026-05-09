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

const AdminResetPasswordSchema = z.object({ newPassword: z.string().min(8) });

// ============================================================================
// DTOs
// ============================================================================

export type AdminCreateUserDto = z.infer<typeof AdminCreateUserSchema>;

export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserSchema>;

export type AdminResetPasswordDto = z.infer<typeof AdminResetPasswordSchema>;
