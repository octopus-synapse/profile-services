/**
 * Themes Port
 *
 * Defines the use cases interface and injection token for the Themes submodule.
 */

import type {
  ApplyThemeToResume,
  CreateTheme,
  ForkTheme,
  QueryThemes,
  ThemeApproval,
  UpdateTheme,
} from '@/shared-kernel';
import type {
  ThemeEntity,
  ThemeWithAuthor,
  ThemeWithAuthorEmail,
} from '../../domain/ports/theme.repository.port';

// ============================================================================
// Injection Tokens
// ============================================================================

export const THEME_USE_CASES = Symbol('THEME_USE_CASES');

// ============================================================================
// Pagination Types
// ============================================================================

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

// ============================================================================
// Use Cases Interface
// ============================================================================

export interface ThemeUseCases {
  // CRUD
  createThemeUseCase: {
    execute: (userId: string, themeData: CreateTheme) => Promise<ThemeEntity>;
  };
  updateThemeUseCase: {
    execute: (userId: string, themeId: string, updateData: UpdateTheme) => Promise<ThemeEntity>;
  };
  deleteThemeUseCase: {
    execute: (userId: string, themeId: string) => Promise<ThemeEntity>;
  };
  getThemeUseCase: {
    execute: (themeId: string) => Promise<ThemeEntity>;
  };
  createThemeAsAdminUseCase: {
    execute: (adminId: string, themeData: CreateTheme) => Promise<ThemeEntity>;
  };

  // Approval
  submitThemeForApprovalUseCase: {
    execute: (userId: string, themeId: string) => Promise<ThemeEntity>;
  };
  reviewThemeUseCase: {
    execute: (approverId: string, dto: ThemeApproval) => Promise<ThemeEntity>;
  };
  getPendingApprovalsUseCase: {
    execute: (approverId: string) => Promise<ThemeWithAuthorEmail[]>;
  };

  // Application
  applyThemeToResumeUseCase: {
    execute: (userId: string, data: ApplyThemeToResume) => Promise<void>;
  };
  forkThemeUseCase: {
    execute: (userId: string, data: ForkTheme) => Promise<ThemeEntity>;
  };
  getResolvedThemeConfigUseCase: {
    execute: (resumeId: string, userId: string) => Promise<Record<string, unknown> | null>;
  };

  // Query
  listThemesUseCase: {
    execute: (query: QueryThemes, userId?: string) => Promise<ThemePaginatedResult>;
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
    execute: (themeId: string, userId?: string) => Promise<ThemeWithAuthor | null>;
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
