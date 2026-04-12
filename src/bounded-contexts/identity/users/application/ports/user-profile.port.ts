/**
 * User Profile Port
 *
 * Defines domain types and repository abstraction for user profile operations.
 */

// ============================================================================
// Domain Types
// ============================================================================

export type PublicProfileUser = {
  id: string;
  username: string;
  name: string | null;
  photoURL: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
};

export type PublicProfileData = {
  user: PublicProfileUser;
  resume: Record<string, unknown> | null;
};

export type UserProfile = {
  id: string;
  email: string | null;
  username?: string | null;
  name?: string | null;
  photoURL?: string | null;
  bio?: string | null;
  location?: string | null;
  phone?: string | null;
  website?: string | null;
  linkedin?: string | null;
  github?: string | null;
  twitter?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateProfileData = {
  name?: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  title?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  image?: string;
  photoURL?: string;
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class UserProfileRepositoryPort {
  abstract findUserByUsername(username: string): Promise<{
    id: string;
    username: string | null;
    name: string | null;
    photoURL: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    linkedin: string | null;
    github: string | null;
  } | null>;

  abstract findResumeByUserId(userId: string): Promise<Record<string, unknown> | null>;

  abstract findUserProfileById(userId: string): Promise<UserProfile | null>;

  abstract findUserById(userId: string): Promise<{ id: string } | null>;

  abstract updateUserProfile(userId: string, data: UpdateProfileData): Promise<UserProfile>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const USER_PROFILE_USE_CASES = Symbol('USER_PROFILE_USE_CASES');

export interface UserProfileUseCases {
  getPublicProfileUseCase: {
    execute: (username: string) => Promise<PublicProfileData>;
  };
  getProfileUseCase: {
    execute: (userId: string) => Promise<UserProfile>;
  };
  updateProfileUseCase: {
    execute: (userId: string, data: UpdateProfileData) => Promise<UserProfile>;
  };
}
