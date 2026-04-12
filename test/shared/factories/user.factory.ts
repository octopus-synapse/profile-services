/**
 * User Test Factory
 * Creates mock User objects for testing with proper types
 *
 * Note: User model no longer has a 'role' field.
 * Authorization is handled via the RBAC system (UserRoleAssignment, etc.)
 */

import { User } from '@prisma/client';

export interface CreateMockUserOptions {
  id?: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  emailVerified?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  passwordHash?: string | null;
  image?: string | null;
  photoURL?: string | null;
  usernameUpdatedAt?: Date | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  hasCompletedOnboarding?: boolean;
  onboardingCompletedAt?: Date | null;
  isActive?: boolean;
  lastLoginAt?: Date | null;
  roles?: string[];
}

const defaultUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  emailVerified: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  passwordHash: 'hashed-password',
  image: null,
  primaryResumeId: null,
  photoURL: null,
  usernameUpdatedAt: null,
  phone: null,
  location: null,
  bio: null,
  website: null,
  linkedin: null,
  github: null,
  hasCompletedOnboarding: false,
  onboardingCompletedAt: null,
  isActive: true,
  lastLoginAt: null,
  roles: ['role_user'],
};

export function createMockUser(options: CreateMockUserOptions = {}): User {
  return {
    ...defaultUser,
    ...options,
    createdAt: options.createdAt ?? defaultUser.createdAt,
    updatedAt: options.updatedAt ?? defaultUser.updatedAt,
  };
}

/**
 * Creates a mock user that would have admin permissions.
 * Uses the simplified RBAC system with roles array.
 */
export function createMockAdmin(options: CreateMockUserOptions = {}): User {
  return createMockUser({
    ...options,
    id: options.id ?? 'admin-user-123',
    roles: options.roles ?? ['role_user', 'role_admin'],
  });
}

/**
 * Creates a mock user with super admin access.
 */
export function createMockSuperAdmin(options: CreateMockUserOptions = {}): User {
  return createMockUser({
    ...options,
    id: options.id ?? 'super-admin-123',
    roles: options.roles ?? ['role_user', 'role_super_admin'],
  });
}

export function createMockVerifiedUser(options: CreateMockUserOptions = {}): User {
  return createMockUser({
    ...options,
    emailVerified: new Date(),
  });
}
