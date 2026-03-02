import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersProfileController } from './users-profile.controller';
import { UsersService } from '../users.service';

const createMockService = () => ({
  getPublicProfileByUsername: mock(() =>
    Promise.resolve({ user: { displayName: 'John' }, resume: { id: 'resume-1' } }),
  ),
  getProfile: mock(() => Promise.resolve({ id: 'user-1', email: 'john@example.com' })),
  updateProfile: mock(() => Promise.resolve({ success: true, user: { displayName: 'John Updated' } })),
  updateUsername: mock(() => Promise.resolve({ success: true, username: 'john_doe', message: 'Username updated successfully' })),
  checkUsernameAvailability: mock(() => Promise.resolve({ username: 'john_doe', available: true })),
});

describe('UsersProfileController - Contract', () => {
  let controller: UsersProfileController;

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
    const result = await controller.getProfile({ userId: 'user-1' } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('profile');
  });

  it('updateProfile returns data with profile', async () => {
    const result = await controller.updateProfile({ userId: 'user-1' } as any, { displayName: 'John Updated' } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('profile');
  });

  it('updateUsername returns data with username and message', async () => {
    const result = await controller.updateUsername({ userId: 'user-1' } as any, { username: 'john_doe' } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('username');
    expect(result.data).toHaveProperty('message');
  });

  it('checkUsernameAvailability returns data with username and available', async () => {
    const result = await controller.checkUsernameAvailability({ userId: 'user-1' } as any, 'john_doe');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('username');
    expect(result.data).toHaveProperty('available');
  });
});
