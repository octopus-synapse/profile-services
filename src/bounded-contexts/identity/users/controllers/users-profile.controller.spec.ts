import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { UsersService } from '../users.service';
import { UsersProfileController } from './users-profile.controller';

const createMockService = () => ({
  getPublicProfileByUsername: mock(() =>
    Promise.resolve({
      user: { displayName: 'John' },
      resume: { id: 'resume-1' },
    }),
  ),
  getProfile: mock(() => Promise.resolve({ id: 'user-1', email: 'john@example.com' })),
  updateProfile: mock(() => Promise.resolve({ displayName: 'John Updated' })),
  updateUsername: mock(() =>
    Promise.resolve({
      success: true,
      username: 'john_doe',
      message: 'Username updated successfully',
    }),
  ),
  checkUsernameAvailability: mock(() => Promise.resolve({ username: 'john_doe', available: true })),
});

/**
 * Factory function to create a properly typed UserPayload for tests
 */
function createAuthUser(overrides: Partial<UserPayload> = {}): UserPayload {
  return {
    userId: 'user-1',
    email: 'test@test.com',
    hasCompletedOnboarding: true,
    ...overrides,
  };
}

describe('UsersProfileController - Contract', () => {
  let controller: UsersProfileController;
  type UpdateProfileDto = Parameters<UsersProfileController['updateProfile']>[1];
  type UpdateUsernameDto = Parameters<UsersProfileController['updateUsername']>[1];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersProfileController],
      providers: [{ provide: UsersService, useValue: createMockService() }],
    }).compile();

    controller = module.get<UsersProfileController>(UsersProfileController);
  });

  it('getPublicProfileByUsername returns data with user and resume', async () => {
    const result = await controller.getPublicProfileByUsername('john');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('user');
    expect(result.data).toHaveProperty('resume');
  });

  it('getProfile returns data with profile', async () => {
    const result = await controller.getProfile(createAuthUser());

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('profile');
  });

  it('updateProfile returns data with profile', async () => {
    const updateDto: UpdateProfileDto = { name: 'John Updated' };
    const result = await controller.updateProfile(createAuthUser(), updateDto);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('profile');
  });

  it('updateUsername returns data with username and message', async () => {
    const updateDto: UpdateUsernameDto = { username: 'john_doe' };
    const result = await controller.updateUsername(createAuthUser(), updateDto);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('username');
    expect(result.data).toHaveProperty('message');
  });

  it('checkUsernameAvailability returns data with username and available', async () => {
    const result = await controller.checkUsernameAvailability(createAuthUser(), 'john_doe');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('username');
    expect(result.data).toHaveProperty('available');
  });
});
