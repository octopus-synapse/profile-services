import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { PublicThemeController } from './public-theme.controller';
import { ThemeQueryService } from '../services/theme-query.service';

const createQueryService = () => ({
  findAllThemesWithPagination: mock(() =>
    Promise.resolve({
      themes: [{ id: 'theme-1' }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    }),
  ),
  findPopularThemes: mock(() => Promise.resolve([{ id: 'theme-2' }])),
  findAllSystemThemes: mock(() => Promise.resolve([{ id: 'theme-3' }])),
  findThemeById: mock(() => Promise.resolve({ id: 'theme-4' })),
});

describe('PublicThemeController - Contract', () => {
  let controller: PublicThemeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicThemeController],
      providers: [
        { provide: ThemeQueryService, useValue: createQueryService() },
      ],
    }).compile();

    controller = module.get<PublicThemeController>(PublicThemeController);
  });

  it('findAllThemesWithPagination returns data with themes and pagination', async () => {
    const result = await controller.findAllThemesWithPagination({
      page: 1,
      limit: 20,
    } as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('themes');
    expect(result.data).toHaveProperty('pagination');
  });

  it('findPopularThemes returns data with themes', async () => {
    const result = await controller.findPopularThemes(10);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('themes');
  });

  it('findAllSystemThemes returns data with themes', async () => {
    const result = await controller.findAllSystemThemes();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('themes');
  });

  it('findThemeById returns data with theme', async () => {
    const result = await controller.findThemeById('theme-4');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('theme');
  });
});
