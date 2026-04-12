import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { USER_PROFILE_USE_CASES } from '../../application/ports/user-profile.port';
import { UsernameService } from '../../application/services/username.service';
import { UsersProfileController } from './users-profile.controller';

const createMockProfileUseCases = () => ({
  getPublicProfileUseCase: {
    execute: mock(() =>
      Promise.resolve({ user: { displayName: 'John' }, resume: { id: 'resume-1' } }),
    ),
  },
  getProfileUseCase: {
    execute: mock(() => Promise.resolve({ id: 'user-1', email: 'john@example.com' })),
  },
  updateProfileUseCase: {
    execute: mock(() => Promise.resolve({ displayName: 'John Updated' })),
  },
});

const createMockUsernameService = () => ({
  updateUsername: mock(() => Promise.resolve({ username: 'john_doe' })),
  checkUsernameAvailability: mock(() => Promise.resolve({ username: 'john_doe', available: true })),
  validateUsername: mock(() =>
    Promise.resolve({ username: 'john_doe', valid: true, available: true, errors: [] }),
  ),
});

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
      providers: [
        { provide: USER_PROFILE_USE_CASES, useValue: createMockProfileUseCases() },
        { provide: UsernameService, useValue: createMockUsernameService() },
      ],
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
