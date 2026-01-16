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
  password?: string | null;
  image?: string | null;
  displayName?: string | null;
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
}

const defaultUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  emailVerified: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  password: 'hashed-password',
  image: null,
  primaryResumeId: null,
  displayName: null,
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
 * Note: The actual admin permissions come from UserRoleAssignment,
 * not from a 'role' field on the User model.
 */
export function createMockAdmin(options: CreateMockUserOptions = {}): User {
  return createMockUser({
    ...options,
    id: options.id ?? 'admin-user-123',
  });
}

export function createMockVerifiedUser(
  options: CreateMockUserOptions = {},
): User {
  return createMockUser({
    ...options,
    emailVerified: new Date(),
  });
}
