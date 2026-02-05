import { z } from 'zod';

/**
 * User Role Enum (Domain)
 *
 * Defines the different roles that a user can have in the system.
 * This is a DOMAIN concept - independent of any infrastructure (Prisma, etc).
 */
export const UserRoleSchema = z.enum(['USER', 'ADMIN', 'APPROVER']);

export type UserRole = z.infer<typeof UserRoleSchema>;
