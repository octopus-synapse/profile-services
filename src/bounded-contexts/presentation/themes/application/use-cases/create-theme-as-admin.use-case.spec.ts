import { beforeEach, describe, expect, it } from 'bun:test';
import { ForbiddenException } from '@nestjs/common';
import type { CreateTheme } from '@/shared-kernel';
import { InMemoryThemeRepository, StubAuthorizationService } from '../../../testing';
import { ThemeCategory, ThemeStatus } from '../../domain/ports/theme.repository.port';
import { CreateThemeAsAdminUseCase } from './create-theme-as-admin.use-case';

describe('CreateThemeAsAdminUseCase', () => {
  let useCase: CreateThemeAsAdminUseCase;
  let themeRepo: InMemoryThemeRepository;
  let authorization: StubAuthorizationService;

  beforeEach(() => {
    themeRepo = new InMemoryThemeRepository();
    authorization = new StubAuthorizationService();
    authorization.grantPermission('admin-1', 'theme:manage');
    useCase = new CreateThemeAsAdminUseCase(themeRepo, authorization);
  });

  it('should create a theme as PUBLISHED when user is admin', async () => {
    const input: CreateTheme = {
      name: 'Admin Theme',
      description: 'Created by admin',
      category: ThemeCategory.PROFESSIONAL,
      tags: ['modern'],
      styleConfig: {},
    };

    const result = await useCase.execute('admin-1', input);

    expect(result.status).toBe(ThemeStatus.PUBLISHED);
    expect(result.authorId).toBe('admin-1');
    expect(result.approvedById).toBe('admin-1');
  });

  it('should throw ForbiddenException when user is not admin', async () => {
    const input: CreateTheme = {
      name: 'Theme',
      description: 'test',
      category: ThemeCategory.PROFESSIONAL,
      tags: [],
      styleConfig: {},
    };

    await expect(useCase.execute('user-1', input)).rejects.toThrow(ForbiddenException);
  });
});
