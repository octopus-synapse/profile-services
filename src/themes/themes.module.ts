import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  PublicThemeController,
  UserThemeController,
  AdminThemeController,
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
  imports: [PrismaModule],
  controllers: [
    PublicThemeController,
    UserThemeController,
    AdminThemeController,
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
