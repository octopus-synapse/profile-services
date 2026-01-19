import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../authorization';
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
  SectionVisibilityService,
  SectionOrderingService,
} from './services';
import {
  ThemeRepository,
  ResumeRepository,
  ResumeConfigRepository,
} from './repositories';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [
    PublicThemeController,
    UserThemeController,
    ThemeApprovalController,
    SectionConfigController,
  ],
  providers: [
    // Repositories
    ThemeRepository,
    ResumeRepository,
    ResumeConfigRepository,
    // Services
    ThemeCrudService,
    ThemeQueryService,
    ThemeApprovalService,
    ThemeApplicationService,
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
