import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { UsersService } from '../users.service';
import { UsersPreferencesController } from './users-preferences.controller';

const createMockService = () => ({
  getPreferences: mock(() => Promise.resolve({ locale: 'pt-BR', timezone: 'America/Sao_Paulo' })),
  updatePreferences: mock(() =>
    Promise.resolve({
      success: true,
      message: 'Preferences updated successfully',
    }),
  ),
  getFullPreferences: mock(() => Promise.resolve({ locale: 'pt-BR', theme: 'dark' })),
  updateFullPreferences: mock(() =>
    Promise.resolve({
      success: true,
      preferences: { locale: 'en-US', theme: 'light' },
    }),
  ),
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

describe('UsersPreferencesController - Contract', () => {
  let controller: UsersPreferencesController;
  type UpdatePreferencesDto = Parameters<UsersPreferencesController['updatePreferences']>[1];
  type UpdateFullPreferencesDto = Parameters<
    UsersPreferencesController['updateFullPreferences']
  >[1];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersPreferencesController],
      providers: [{ provide: UsersService, useValue: createMockService() }],
    }).compile();

    controller = module.get<UsersPreferencesController>(UsersPreferencesController);
  });

  it('getPreferences returns data with preferences', async () => {
    const result = await controller.getPreferences(createAuthUser());

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('preferences');
  });

  it('updatePreferences returns data with message', async () => {
    const updateDto: UpdatePreferencesDto = { palette: 'sunset' };
    const result = await controller.updatePreferences(createAuthUser(), updateDto);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('message');
  });

  it('getFullPreferences returns data with preferences', async () => {
    const result = await controller.getFullPreferences(createAuthUser());

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('preferences');
  });

  it('updateFullPreferences returns data with preferences', async () => {
    const updateDto: UpdateFullPreferencesDto = { theme: 'light' };
    const result = await controller.updateFullPreferences(createAuthUser(), updateDto);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('preferences');
  });
});
