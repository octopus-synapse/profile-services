import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersPreferencesController } from './users-preferences.controller';
import { UsersService } from '../users.service';

const createMockService = () => ({
  getPreferences: mock(() => Promise.resolve({ locale: 'pt-BR', timezone: 'America/Sao_Paulo' })),
  updatePreferences: mock(() => Promise.resolve({ success: true, message: 'Preferences updated successfully' })),
  getFullPreferences: mock(() => Promise.resolve({ locale: 'pt-BR', theme: 'dark' })),
  updateFullPreferences: mock(() => Promise.resolve({ success: true, preferences: { locale: 'en-US', theme: 'light' } })),
});

describe('UsersPreferencesController - Contract', () => {
  let controller: UsersPreferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersPreferencesController],
      providers: [{ provide: UsersService, useValue: createMockService() }],
    }).compile();

    controller = module.get<UsersPreferencesController>(UsersPreferencesController);
  });

  it('getPreferences returns data with preferences', async () => {
    const result = await controller.getPreferences({ userId: 'user-1' } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('preferences');
  });

  it('updatePreferences returns data with message', async () => {
    const result = await controller.updatePreferences({ userId: 'user-1' } as any, { locale: 'en-US' } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('message');
  });

  it('getFullPreferences returns data with preferences', async () => {
    const result = await controller.getFullPreferences({ userId: 'user-1' } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('preferences');
  });

  it('updateFullPreferences returns data with preferences', async () => {
    const result = await controller.updateFullPreferences({ userId: 'user-1' } as any, { theme: 'light' } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('preferences');
  });
});
