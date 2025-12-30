/**
 * User Test Factory
 * Creates mock User objects for testing with proper types
 */

import { User, UserRole } from '@prisma/client';

export interface CreateMockUserOptions {
  id?: string;
  email?: string;
  name?: string;
  username?: string;
  role?: UserRole;
  emailVerified?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  password?: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  twitter?: string | null;
  subtitle?: string | null;
  pronouns?: string | null;
  company?: string | null;
  companyLogo?: string | null;
  dateOfBirth?: Date | null;
  nationality?: string | null;
  introMessage?: string | null;
  headline?: string | null;
  availabilityStatus?: string | null;
  portfolioUrl?: string | null;
  cvFileUrl?: string | null;
  mbtiType?: string | null;
  preferredWorkStyle?: string | null;
  communicationStyle?: string | null;
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
  phone: null,
  location: null,
  bio: null,
  avatar: null,
  website: null,
  linkedin: null,
  github: null,
  twitter: null,
  subtitle: null,
  pronouns: null,
  company: null,
  companyLogo: null,
  dateOfBirth: null,
  nationality: null,
  introMessage: null,
  headline: null,
  availabilityStatus: null,
  portfolioUrl: null,
  cvFileUrl: null,
  mbtiType: null,
  preferredWorkStyle: null,
  communicationStyle: null,
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
