import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ThemeApplicationService, ThemeCrudService, ThemeQueryService } from '../services';
import { UserThemeController } from './user-theme.controller';

const createCrudService = () => ({
  createThemeForUser: mock(() => Promise.resolve({ id: 'theme-1', name: 'Theme 1' })),
  updateThemeForUser: mock(() => Promise.resolve({ id: 'theme-1', name: 'Updated Theme' })),
  deleteThemeForUser: mock(() => Promise.resolve()),
});

const createQueryService = () => ({
  findAllThemesByUser: mock(() => Promise.resolve([{ id: 'theme-1' }])),
});

const createAppService = () => ({
  forkThemeForUser: mock(() => Promise.resolve({ id: 'theme-2', name: 'Forked Theme' })),
  applyToResume: mock(() => Promise.resolve({ success: true })),
  getResolvedConfig: mock(() => Promise.resolve({ color: '#000000' })),
});

describe('UserThemeController - Contract', () => {
  let controller: UserThemeController;
  type CreateThemeInput = Parameters<UserThemeController['createThemeForUser']>[1];
  type UpdateThemeInput = Parameters<UserThemeController['updateThemeForUser']>[2];
  type ForkInput = Parameters<UserThemeController['fork']>[1];
  type ApplyInput = Parameters<UserThemeController['apply']>[1];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserThemeController],
      providers: [
        { provide: ThemeCrudService, useValue: createCrudService() },
        { provide: ThemeQueryService, useValue: createQueryService() },
        { provide: ThemeApplicationService, useValue: createAppService() },
      ],
    }).compile();

    controller = module.get<UserThemeController>(UserThemeController);
  });

  it('getAllThemesByUser returns data with themes', async () => {
    const result = await controller.getAllThemesByUser('user-1');
    expect(result.data).toHaveProperty('themes');
  });

  it('createThemeForUser returns data with theme', async () => {
    const result = await controller.createThemeForUser('user-1', {
      name: 'Theme 1',
    } as unknown as CreateThemeInput);
    expect(result.data).toHaveProperty('theme');
  });

  it('updateThemeForUser returns data with theme', async () => {
    const result = await controller.updateThemeForUser('user-1', 'theme-1', {
      name: 'Updated',
    } as unknown as UpdateThemeInput);
    expect(result.data).toHaveProperty('theme');
  });

  it('fork returns data with theme', async () => {
    const result = await controller.fork('user-1', {
      themeId: 'theme-1',
      name: 'Forked',
    } as unknown as ForkInput);
    expect(result.data).toHaveProperty('theme');
  });

  it('apply returns data with success', async () => {
    const result = await controller.apply('user-1', {
      resumeId: 'resume-1',
      themeId: 'theme-1',
    } as unknown as ApplyInput);
    expect(result.data).toHaveProperty('success');
  });

  it('getResolvedConfig returns data with config', async () => {
    const result = await controller.getResolvedConfig('user-1', 'resume-1');
    expect(result.data).toHaveProperty('config');
  });
});
