/**
 * User Management Service (Facade) Tests
 *
 * Uses In-Memory repository + simple fakes for behavior-focused testing.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { BadRequestException } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import type { AuthorizationService } from '@/bounded-contexts/identity/authorization';
import { InMemoryUserManagementRepository } from '../../shared-kernel/testing';
import { ListUsersUseCase } from './user-management/use-cases/list-users.use-case';
import { GetUserDetailsUseCase } from './user-management/use-cases/get-user-details.use-case';
import { CreateUserUseCase } from './user-management/use-cases/create-user.use-case';
import { UpdateUserUseCase } from './user-management/use-cases/update-user.use-case';
import { DeleteUserUseCase } from './user-management/use-cases/delete-user.use-case';
import { ResetPasswordUseCase } from './user-management/use-cases/reset-password.use-case';
import type { UserManagementUseCases } from './user-management/ports/user-management.port';

class FakeAuthorizationService {
  private privilegedUsers = new Set<string>();
  private usersWithAdminRole = 5;

  setPrivilegedUser(userId: string, isPrivileged: boolean): void {
    if (isPrivileged) {
      this.privilegedUsers.add(userId);
      return;
    }
    this.privilegedUsers.delete(userId);
  }

  setUsersWithAdminRole(count: number): void {
    this.usersWithAdminRole = count;
  }

  async hasPermission(userId: string): Promise<boolean> {
    return this.privilegedUsers.has(userId);
  }

  async countUsersWithRole(): Promise<number> {
    return this.usersWithAdminRole;
  }
}

describe('UserManagementService (Facade)', () => {
  let service: UserManagementService;
  let repository: InMemoryUserManagementRepository;
  let useCases: UserManagementUseCases;
  let authService: FakeAuthorizationService;

  const mockUserId = 'user-123';
  const mockRequesterId = 'admin-456';

  beforeEach(() => {
    repository = new InMemoryUserManagementRepository();
    authService = new FakeAuthorizationService();

    repository.seedUser({
      id: mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      username: 'testuser',
      hasCompletedOnboarding: true,
      counts: { accounts: 1, sessions: 0, resumes: 2 },
    });
    repository.seedUser({ id: mockRequesterId, email: 'admin@example.com' });

    useCases = {
      listUsersUseCase: new ListUsersUseCase(repository as any),
      getUserDetailsUseCase: new GetUserDetailsUseCase(repository as any),
      createUserUseCase: new CreateUserUseCase(
        repository as any,
        async (password: string) => `hashed_${password}`,
      ),
      updateUserUseCase: new UpdateUserUseCase(repository as any),
      deleteUserUseCase: new DeleteUserUseCase(repository as any),
      resetPasswordUseCase: new ResetPasswordUseCase(
        repository as any,
        async (password: string) => `hashed_${password}`,
      ),
    };

    service = new UserManagementService(
      useCases,
      authService as unknown as AuthorizationService,
    );
  });

  describe('listUsers', () => {
    it('should return paginated users list', async () => {
      const options = { page: 1, limit: 20 };

      const result = await service.listUsers(options);

      expect(result.users.length).toBe(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      const options = { page: 1, limit: 20, search: 'john' };

      const result = await service.listUsers(options);
      expect(result.users).toHaveLength(0);
    });
  });

  describe('getUserDetails', () => {
    it('should return user details', async () => {
      const result = await service.getUserDetails(mockUserId);

      expect(result.id).toBe(mockUserId);
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('createUser', () => {
    it('should create and persist a new user', async () => {
      const createData = {
        email: 'new@example.com',
        password: 'SecureP@ss123!',
        role: 'USER' as const,
        name: 'New User',
      };

      const result = await service.createUser(createData);

      expect(result.email).toBe(createData.email);
      expect(result.name).toBe(createData.name);

      const users = repository.getAllUsers();
      expect(users.some((user) => user.email === createData.email)).toBe(true);
    });
  });

  describe('updateUser', () => {
    it('should update existing user', async () => {
      const updateData = { name: 'Updated Name' };

      const result = await service.updateUser(mockUserId, updateData);

      expect(result.name).toBe('Updated Name');
      expect(repository.getUser(mockUserId)?.name).toBe('Updated Name');
    });
  });

  describe('deleteUser', () => {
    it('should delete user when target is not privileged', async () => {
      authService.setPrivilegedUser(mockUserId, false);

      await service.deleteUser(mockUserId, mockRequesterId);

      expect(repository.getUser(mockUserId)).toBeUndefined();
    });

    it('should prevent deleting last privileged user', async () => {
      authService.setPrivilegedUser(mockUserId, true);
      authService.setUsersWithAdminRole(1);

      await expect(
        service.deleteUser(mockUserId, mockRequesterId),
      ).rejects.toThrow(BadRequestException);

      expect(repository.getUser(mockUserId)).toBeDefined();
    });

    it('should allow deleting privileged user when others exist', async () => {
      authService.setPrivilegedUser(mockUserId, true);
      authService.setUsersWithAdminRole(3);

      await service.deleteUser(mockUserId, mockRequesterId);

      expect(repository.getUser(mockUserId)).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset user password', async () => {
      const newPassword = 'NewSecureP@ss123!';

      await service.resetPassword(mockUserId, { newPassword });

      expect(repository.getUser(mockUserId)?.passwordHash).toBe(
        `hashed_${newPassword}`,
      );
    });
  });
});
