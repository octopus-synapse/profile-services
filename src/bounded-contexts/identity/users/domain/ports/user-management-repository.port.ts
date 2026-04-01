/**
 * User Management Repository Port
 *
 * Defines the abstraction for admin user management operations.
 */

import type {
  CreatedUser,
  UpdatedUser,
  UpdateUserData,
  UserDetails,
  UserListItem,
  UserListOptions,
} from '../../domain/types';

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
