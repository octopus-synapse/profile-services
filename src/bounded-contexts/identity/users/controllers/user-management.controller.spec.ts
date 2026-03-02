import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/bounded-contexts/identity/authorization';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from '../services/user-management.service';

const createMockService = () => ({
  listUsers: mock(() =>
    Promise.resolve({
      users: [{ id: 'user-1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  ),
  getUserDetails: mock(() => Promise.resolve({ id: 'user-1', email: 'user@example.com' })),
  createUser: mock(() =>
    Promise.resolve({ user: { id: 'user-1', email: 'new@example.com' }, message: 'User created successfully' }),
  ),
  updateUser: mock(() =>
    Promise.resolve({ user: { id: 'user-1', name: 'Updated User' }, message: 'User updated successfully' }),
  ),
  deleteUser: mock(() => Promise.resolve({ success: true, message: 'User deleted successfully' })),
  resetPassword: mock(() => Promise.resolve({ success: true, message: 'Password reset successfully' })),
});

describe('UserManagementController - Contract', () => {
  let controller: UserManagementController;
  let service: ReturnType<typeof createMockService>;

  beforeEach(async () => {
    service = createMockService();

    const moduleBuilder = Test.createTestingModule({
      controllers: [UserManagementController],
      providers: [{ provide: UserManagementService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<UserManagementController>(UserManagementController);
  });

  it('listUsers returns data with users and pagination', async () => {
    const result = await controller.listUsers(1, 20, 'john');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('users');
    expect(result.data).toHaveProperty('pagination');
  });

  it('getUserDetails returns data with user', async () => {
    const result = await controller.getUserDetails('user-1');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('user');
  });

  it('createUser returns data with user and message', async () => {
    const result = await controller.createUser({
      email: 'new@example.com',
      password: 'Password123!',
      name: 'New User',
    });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('user');
    expect(result.data).toHaveProperty('message');
  });

  it('updateUser returns data with user and message', async () => {
    const result = await controller.updateUser('user-1', { name: 'Updated User' });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('user');
    expect(result.data).toHaveProperty('message');
  });

  it('deleteUser returns data with message', async () => {
    const result = await controller.deleteUser('user-1', { user: { userId: 'admin-1' } });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('message');
  });

  it('resetPassword returns data with message', async () => {
    const result = await controller.resetPassword('user-1', { newPassword: 'NewPassword123!' });

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('message');
  });
});
