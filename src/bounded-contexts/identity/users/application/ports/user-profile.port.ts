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
  portfolio: string | null;
  linkedin: string | null;
  github: string | null;
};

export type PublicProfileData = { user: PublicProfileUser; resume: Record<string, unknown> | null };

export type PublicUserListItem = { username: string; updatedAt: Date };

export type PublicUsersList = {
  items: PublicUserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type UserProfile = {
  id: string;
  email: string | null;
  username?: string | null;
  name?: string | null;
  photoURL?: string | null;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  phone?: string | null;
  website?: string | null;
  portfolio?: string | null;
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
  headline?: string;
  location?: string;
  website?: string;
  portfolio?: string;
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
    portfolio?: string | null;
    linkedin: string | null;
    github: string | null;
  } | null>;

  abstract findResumeByUserId(userId: string): Promise<Record<string, unknown> | null>;

  abstract findUserProfileById(userId: string): Promise<UserProfile | null>;

  abstract findUserById(userId: string): Promise<{ id: string } | null>;

  abstract updateUserProfile(userId: string, data: UpdateProfileData): Promise<UserProfile>;

  abstract listPublicUsers(
    page: number,
    limit: number,
  ): Promise<{ items: PublicUserListItem[]; total: number }>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export abstract class UserProfileUseCases {
  abstract readonly getPublicProfileUseCase: {
    execute: (username: string) => Promise<PublicProfileData>;
  };
  abstract readonly getProfileUseCase: { execute: (userId: string) => Promise<UserProfile> };
  abstract readonly updateProfileUseCase: {
    execute: (userId: string, data: UpdateProfileData) => Promise<UserProfile>;
  };
  abstract readonly listPublicUsersUseCase: {
    execute: (page: number, limit: number) => Promise<PublicUsersList>;
  };
}
