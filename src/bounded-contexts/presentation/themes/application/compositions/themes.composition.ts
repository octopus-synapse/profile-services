/**
 * Themes Composition
 *
 * Wires theme use cases with their dependencies following Clean Architecture.
 * Themes are public and admin-managed. Users can only apply themes to resumes.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventPublisher } from '@/shared-kernel';
import type { AuthorizationPort } from '../../domain/ports/authorization.port';
import { ResumeRepository } from '../../infrastructure/adapters/persistence/resume.repository';
import { ResumeConfigRepository } from '../../infrastructure/adapters/persistence/resume-config.repository';
import { ThemeRepository } from '../../infrastructure/adapters/persistence/theme.repository';
import { THEME_USE_CASES, type ThemeUseCases } from '../ports/themes.port';
import { ApplyThemeToResumeUseCase } from '../use-cases/apply-theme-to-resume.use-case';
import { BatchReorderUseCase } from '../use-cases/batch-reorder.use-case';
import { CreateThemeAsAdminUseCase } from '../use-cases/create-theme-as-admin.use-case';
import { FindThemeByIdUseCase } from '../use-cases/find-theme-by-id.use-case';
import { GetPopularThemesUseCase } from '../use-cases/get-popular-themes.use-case';
import { GetResolvedThemeConfigUseCase } from '../use-cases/get-resolved-theme-config.use-case';
import { GetSystemThemesUseCase } from '../use-cases/get-system-themes.use-case';
import { GetThemeUseCase } from '../use-cases/get-theme.use-case';
import { GetUserThemesUseCase } from '../use-cases/get-user-themes.use-case';
import { ListThemesUseCase } from '../use-cases/list-themes.use-case';
import { ReorderItemUseCase } from '../use-cases/reorder-item.use-case';
import { ReorderSectionUseCase } from '../use-cases/reorder-section.use-case';
import { ToggleItemVisibilityUseCase } from '../use-cases/toggle-item-visibility.use-case';
import { ToggleSectionVisibilityUseCase } from '../use-cases/toggle-section-visibility.use-case';

export { THEME_USE_CASES };

export function buildThemeUseCases(
  prisma: PrismaService,
  authorizationService: AuthorizationPort,
  eventPublisher: EventPublisher,
): ThemeUseCases {
  const themeRepo = new ThemeRepository(prisma);
  const resumeRepo = new ResumeRepository(prisma);
  const resumeConfigRepo = new ResumeConfigRepository(prisma);

  const authorization = {
    hasPermission: (userId: string, resource: string, action: string) =>
      authorizationService.hasPermission(userId, resource, action),
  };

  return {
    // Admin CRUD
    createThemeAsAdminUseCase: new CreateThemeAsAdminUseCase(themeRepo, authorization),
    getThemeUseCase: new GetThemeUseCase(themeRepo),

    // Application
    applyThemeToResumeUseCase: new ApplyThemeToResumeUseCase(themeRepo, resumeRepo, eventPublisher),
    getResolvedThemeConfigUseCase: new GetResolvedThemeConfigUseCase(resumeRepo),

    // Query
    listThemesUseCase: new ListThemesUseCase(themeRepo),
    getPopularThemesUseCase: new GetPopularThemesUseCase(themeRepo),
    getSystemThemesUseCase: new GetSystemThemesUseCase(themeRepo),
    getUserThemesUseCase: new GetUserThemesUseCase(themeRepo),
    findThemeByIdUseCase: new FindThemeByIdUseCase(themeRepo),

    // Section Ordering
    reorderSectionUseCase: new ReorderSectionUseCase(resumeConfigRepo),
    reorderItemUseCase: new ReorderItemUseCase(resumeConfigRepo),
    batchReorderUseCase: new BatchReorderUseCase(resumeConfigRepo),

    // Section Visibility
    toggleSectionVisibilityUseCase: new ToggleSectionVisibilityUseCase(resumeConfigRepo),
    toggleItemVisibilityUseCase: new ToggleItemVisibilityUseCase(resumeConfigRepo),
  };
}
