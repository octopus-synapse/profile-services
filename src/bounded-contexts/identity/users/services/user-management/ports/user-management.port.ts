/**
 * User Management Port
 *
 * Defines domain types and repository abstraction for user management.
 */

// ============================================================================
// Domain Types
// ============================================================================

export type UserListItem = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  hasCompletedOnboarding: boolean;
  createdAt: Date;
  updatedAt: Date;
  image: string | null;
  emailVerified: Date | null;
  resumeCount: number;
};

export type UserDetails = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  hasCompletedOnboarding: boolean;
  createdAt: Date;
  updatedAt: Date;
  image: string | null;
  emailVerified: Date | null;
  resumes: {
    id: string;
    title: string | null;
    template: string | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
  preferences: unknown | null;
  counts: {
    accounts: number;
    sessions: number;
    resumes: number;
  };
};

export type CreatedUser = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: Date;
};

export type UpdatedUser = {
  id: string;
  email: string | null;
  name: string | null;
  username: string | null;
  hasCompletedOnboarding: boolean;
  updatedAt: Date;
};

export type UserListResult = {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateUserData = {
  email: string;
  password: string;
  name?: string;
};

export type UpdateUserData = {
  email?: string;
  name?: string;
  username?: string;
};

export type UserListOptions = {
  page: number;
  limit: number;
  search?: string;
  roleName?: string;
};

// ============================================================================
// Repository Port (Abstraction)
// ============================================================================

export abstract class UserManagementRepositoryPort {
  abstract findUsers(options: UserListOptions): Promise<{
    users: UserListItem[];
    total: number;
  }>;

  abstract findUserById(userId: string): Promise<{ id: string } | null>;

  abstract findUserDetails(userId: string): Promise<UserDetails | null>;

  abstract createUser(data: {
    email: string;
    hashedPassword: string;
    name?: string;
  }): Promise<CreatedUser>;

  abstract updateUser(userId: string, data: UpdateUserData): Promise<UpdatedUser>;

  abstract deleteUser(userId: string): Promise<void>;

  abstract resetUserPassword(userId: string, hashedPassword: string): Promise<void>;
}

// ============================================================================
// Use Cases Interface
// ============================================================================

export const USER_MANAGEMENT_USE_CASES = Symbol('USER_MANAGEMENT_USE_CASES');

export interface UserManagementUseCases {
  listUsersUseCase: {
    execute: (options: UserListOptions) => Promise<UserListResult>;
  };
  getUserDetailsUseCase: {
    execute: (userId: string) => Promise<UserDetails>;
  };
  createUserUseCase: {
    execute: (data: CreateUserData) => Promise<CreatedUser>;
  };
  updateUserUseCase: {
    execute: (userId: string, data: UpdateUserData) => Promise<UpdatedUser>;
  };
  deleteUserUseCase: {
    execute: (userId: string, requesterId: string) => Promise<void>;
  };
  resetPasswordUseCase: {
    execute: (userId: string, newPassword: string) => Promise<void>;
  };
}
