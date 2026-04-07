/**
 * Themes Composition
 *
 * Wires theme use cases with their dependencies following Clean Architecture.
 */

import type { AuthorizationServicePort } from '@/bounded-contexts/identity/authorization';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventPublisher } from '@/shared-kernel';
import { ResumeConfigRepository } from '../../infrastructure/adapters/persistence/resume-config.repository';
import { ResumeRepository } from '../../infrastructure/adapters/persistence/resume.repository';
import { ThemeRepository } from '../../infrastructure/adapters/persistence/theme.repository';
import { THEME_USE_CASES, type ThemeUseCases } from '../ports/themes.port';
import { ApplyThemeToResumeUseCase } from '../use-cases/apply-theme-to-resume.use-case';
import { BatchReorderUseCase } from '../use-cases/batch-reorder.use-case';
import { CreateThemeAsAdminUseCase } from '../use-cases/create-theme-as-admin.use-case';
import { CreateThemeUseCase } from '../use-cases/create-theme.use-case';
import { DeleteThemeUseCase } from '../use-cases/delete-theme.use-case';
import { FindThemeByIdUseCase } from '../use-cases/find-theme-by-id.use-case';
import { ForkThemeUseCase } from '../use-cases/fork-theme.use-case';
import { GetPendingApprovalsUseCase } from '../use-cases/get-pending-approvals.use-case';
import { GetPopularThemesUseCase } from '../use-cases/get-popular-themes.use-case';
import { GetResolvedThemeConfigUseCase } from '../use-cases/get-resolved-theme-config.use-case';
import { GetSystemThemesUseCase } from '../use-cases/get-system-themes.use-case';
import { GetThemeUseCase } from '../use-cases/get-theme.use-case';
import { GetUserThemesUseCase } from '../use-cases/get-user-themes.use-case';
import { ListThemesUseCase } from '../use-cases/list-themes.use-case';
import { ReorderItemUseCase } from '../use-cases/reorder-item.use-case';
import { ReorderSectionUseCase } from '../use-cases/reorder-section.use-case';
import { ReviewThemeUseCase } from '../use-cases/review-theme.use-case';
import { SubmitThemeForApprovalUseCase } from '../use-cases/submit-theme-for-approval.use-case';
import { ToggleItemVisibilityUseCase } from '../use-cases/toggle-item-visibility.use-case';
import { ToggleSectionVisibilityUseCase } from '../use-cases/toggle-section-visibility.use-case';
import { UpdateThemeUseCase } from '../use-cases/update-theme.use-case';

export { THEME_USE_CASES };

export function buildThemeUseCases(
  prisma: PrismaService,
  authorizationService: AuthorizationServicePort,
  eventPublisher: EventPublisher,
): ThemeUseCases {
  const themeRepo = new ThemeRepository(prisma);
  const resumeRepo = new ResumeRepository(prisma);
  const resumeConfigRepo = new ResumeConfigRepository(prisma);

  // Wrap AuthorizationServicePort as AuthorizationPort
  const authorization = {
    hasPermission: (userId: string, resource: string, action: string) =>
      authorizationService.hasPermission(userId, resource, action),
  };

  return {
    // CRUD
    createThemeUseCase: new CreateThemeUseCase(themeRepo),
    updateThemeUseCase: new UpdateThemeUseCase(themeRepo, authorization),
    deleteThemeUseCase: new DeleteThemeUseCase(themeRepo),
    getThemeUseCase: new GetThemeUseCase(themeRepo),
    createThemeAsAdminUseCase: new CreateThemeAsAdminUseCase(themeRepo, authorization),

    // Approval
    submitThemeForApprovalUseCase: new SubmitThemeForApprovalUseCase(themeRepo),
    reviewThemeUseCase: new ReviewThemeUseCase(themeRepo, authorization),
    getPendingApprovalsUseCase: new GetPendingApprovalsUseCase(themeRepo, authorization),

    // Application
    applyThemeToResumeUseCase: new ApplyThemeToResumeUseCase(themeRepo, resumeRepo, eventPublisher),
    forkThemeUseCase: new ForkThemeUseCase(themeRepo),
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
