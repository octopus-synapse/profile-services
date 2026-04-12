import { forwardRef, Module } from '@nestjs/common';
import { ThemeATSScoringStrategy } from '@/bounded-contexts/ats-validation/ats/scoring/theme-ats-scoring.strategy';
import { DslModule } from '@/bounded-contexts/dsl/dsl.module';
import { ExportModule } from '@/bounded-contexts/export/export.module';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { AuthorizationCheckPort } from '@/shared-kernel/authorization';
import { PublicThemeController, SectionConfigController, UserThemeController } from './controllers';
import { AtsScorngPort } from './domain/ports/ats-scoring.port';
import { AuthorizationPort } from './domain/ports/authorization.port';
import { ThemePreviewPort } from './domain/ports/theme-preview.port';
import { ThemePreviewService } from './infrastructure/adapters/theme-preview.adapter';
import {
  ResumeConfigRepository,
  SectionOrderingService,
  SectionVisibilityService,
  ThemeApplicationService,
  ThemeCrudService,
  ThemeQueryService,
} from './services';

@Module({
  imports: [PrismaModule, DslModule, forwardRef(() => ExportModule)],
  controllers: [UserThemeController, PublicThemeController, SectionConfigController],
  providers: [
    ThemeCrudService,
    ThemeQueryService,
    ThemeApplicationService,
    ResumeConfigRepository,
    SectionVisibilityService,
    SectionOrderingService,
    ThemePreviewService,
    S3UploadService,
    { provide: AuthorizationPort, useExisting: AuthorizationCheckPort },
    { provide: AtsScorngPort, useClass: ThemeATSScoringStrategy },
    { provide: ThemePreviewPort, useExisting: ThemePreviewService },
  ],
  exports: [
    ThemeCrudService,
    ThemeQueryService,
    ThemeApplicationService,
    SectionVisibilityService,
    SectionOrderingService,
    ThemePreviewService,
  ],
})
export class ThemesModule {}
