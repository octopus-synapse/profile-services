/**
 * Themes Port
 *
 * Defines the use cases interface and injection token for the Themes submodule.
 * Themes are public and admin-managed. Users can only apply and query themes.
 */

import type { ApplyThemeToResume, CreateTheme, QueryThemes } from '@/shared-kernel';
import type { ThemeEntity, ThemeWithAuthor } from '../../domain/ports/theme.repository.port';

export const THEME_USE_CASES = Symbol('THEME_USE_CASES');

export type ThemePagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ThemePaginatedResult<TTheme = unknown> = {
  themes: TTheme[];
  pagination: ThemePagination;
};

export interface ThemeUseCases {
  // Admin CRUD
  createThemeAsAdminUseCase: {
    execute: (adminId: string, themeData: CreateTheme) => Promise<ThemeEntity>;
  };
  getThemeUseCase: {
    execute: (themeId: string) => Promise<ThemeEntity>;
  };

  // Application
  applyThemeToResumeUseCase: {
    execute: (userId: string, data: ApplyThemeToResume) => Promise<void>;
  };
  getResolvedThemeConfigUseCase: {
    execute: (resumeId: string, userId: string) => Promise<Record<string, unknown> | null>;
  };

  // Query
  listThemesUseCase: {
    execute: (query: QueryThemes) => Promise<ThemePaginatedResult>;
  };
  getPopularThemesUseCase: {
    execute: (limit?: number) => Promise<ThemeWithAuthor[]>;
  };
  getSystemThemesUseCase: {
    execute: () => Promise<ThemeEntity[]>;
  };
  getUserThemesUseCase: {
    execute: (userId: string) => Promise<ThemeEntity[]>;
  };
  findThemeByIdUseCase: {
    execute: (themeId: string) => Promise<ThemeWithAuthor | null>;
  };

  // Section Ordering
  reorderSectionUseCase: {
    execute: (
      userId: string,
      resumeId: string,
      sectionId: string,
      newOrder: number,
    ) => Promise<void>;
  };
  reorderItemUseCase: {
    execute: (
      userId: string,
      resumeId: string,
      sectionId: string,
      itemId: string,
      newOrder: number,
    ) => Promise<void>;
  };
  batchReorderUseCase: {
    execute: (
      userId: string,
      resumeId: string,
      updates: Array<{ id: string; visible?: boolean; order?: number; column?: string }>,
    ) => Promise<void>;
  };

  // Section Visibility
  toggleSectionVisibilityUseCase: {
    execute: (
      userId: string,
      resumeId: string,
      sectionId: string,
      visible: boolean,
    ) => Promise<void>;
  };
  toggleItemVisibilityUseCase: {
    execute: (
      userId: string,
      resumeId: string,
      sectionId: string,
      itemId: string,
      visible: boolean,
    ) => Promise<void>;
  };
}
