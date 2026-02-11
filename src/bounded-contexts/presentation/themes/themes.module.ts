import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import {
  PublicThemeController,
  SectionConfigController,
  ThemeApprovalController,
  UserThemeController,
} from './controllers';
import {
  ResumeConfigRepository,
  SectionOrderingService,
  SectionVisibilityService,
  ThemeApplicationService,
  ThemeApprovalService,
  ThemeCrudService,
  ThemeQueryService,
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
