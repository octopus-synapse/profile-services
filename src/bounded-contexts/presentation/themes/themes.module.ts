import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import {
  PublicThemeController,
  UserThemeController,
  ThemeApprovalController,
  SectionConfigController,
} from './controllers';
import {
  ThemeCrudService,
  ThemeQueryService,
  ThemeApprovalService,
  ThemeApplicationService,
  ResumeConfigRepository,
  SectionVisibilityService,
  SectionOrderingService,
} from './services';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [
    PublicThemeController,
    UserThemeController,
    ThemeApprovalController,
    SectionConfigController,
  ],
  providers: [
    ThemeCrudService,
    ThemeQueryService,
    ThemeApprovalService,
    ThemeApplicationService,
    ResumeConfigRepository,
    SectionVisibilityService,
    SectionOrderingService,
  ],
  exports: [
    ThemeCrudService,
    ThemeQueryService,
    ThemeApplicationService,
    SectionVisibilityService,
    SectionOrderingService,
  ],
})
export class ThemesModule {}
