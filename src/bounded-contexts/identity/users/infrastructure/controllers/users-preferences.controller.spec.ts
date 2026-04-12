import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import { USER_PREFERENCES_USE_CASES } from '../../application/ports/user-preferences.port';
import { UsersPreferencesController } from './users-preferences.controller';

const createMockPreferencesUseCases = () => ({
  getPreferencesUseCase: {
    execute: mock(() => Promise.resolve({ locale: 'pt-BR', timezone: 'America/Sao_Paulo' })),
  },
  updatePreferencesUseCase: {
    execute: mock(() => Promise.resolve()),
  },
  getFullPreferencesUseCase: {
    execute: mock(() => Promise.resolve({ locale: 'pt-BR', theme: 'dark' })),
  },
  updateFullPreferencesUseCase: {
    execute: mock(() => Promise.resolve({ locale: 'en-US', theme: 'light' })),
  },
});

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
      providers: [
        { provide: USER_PREFERENCES_USE_CASES, useValue: createMockPreferencesUseCases() },
      ],
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
