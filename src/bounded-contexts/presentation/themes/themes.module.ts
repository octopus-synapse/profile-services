import { Module } from '@nestjs/common';
import { AuthorizationCheckPort } from '@/shared-kernel/authorization';
import { AuthorizationPort } from './domain/ports/authorization.port';
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
  imports: [PrismaModule],
  controllers: [
    // UserThemeController MUST come before PublicThemeController
    // so that @Get('me') matches before @Get(':id')
    UserThemeController,
    ThemeApprovalController,
    PublicThemeController,
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
    { provide: AuthorizationPort, useExisting: AuthorizationCheckPort },
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
