/**
 * User Test Factory
 * Creates mock User objects for testing with proper types
 */

import { User, UserRole } from '@prisma/client';

export interface CreateMockUserOptions {
  id?: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  role?: UserRole;
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
  bannerColor?: string | null;
  palette?: string | null;
  hasCompletedOnboarding?: boolean;
  onboardingCompletedAt?: Date | null;
}

const defaultUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  role: 'USER',
  emailVerified: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  password: 'hashed-password',
  image: null,
  displayName: null,
  photoURL: null,
  usernameUpdatedAt: null,
  phone: null,
  location: null,
  bio: null,
  website: null,
  linkedin: null,
  github: null,
  bannerColor: null,
  palette: null,
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

export function createMockAdmin(options: CreateMockUserOptions = {}): User {
  return createMockUser({
    ...options,
    role: 'ADMIN',
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
