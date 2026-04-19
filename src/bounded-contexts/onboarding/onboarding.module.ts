/**
 * Onboarding Module
 *
 * ADR-001: Flat Hexagonal Architecture.
 * Session/Commands API for backend-driven onboarding flow.
 */

import { forwardRef, Module } from '@nestjs/common';
import { DslModule } from '@/bounded-contexts/dsl/dsl.module';
import { ExportModule } from '@/bounded-contexts/export/export.module';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  buildOnboardingUseCases,
  ONBOARDING_USE_CASES,
} from './application/compositions/onboarding.composition';
import {
  buildOnboardingProgressUseCases,
  ONBOARDING_PROGRESS_USE_CASES,
} from './application/compositions/onboarding-progress.composition';
import { OnboardingConfigPort } from './domain/ports/onboarding-config.port';
import { PreviewRendererPort } from './domain/ports/preview-renderer.port';
import { SectionTypeDefinitionPort } from './domain/ports/section-type-definition.port';
import { SystemThemesPort } from './domain/ports/system-themes.port';
import { OnboardingConfigAdapter } from './infrastructure/adapters/onboarding-config.adapter';
import { OnboardingPreviewAdapter } from './infrastructure/adapters/onboarding-preview.adapter';
import { SectionTypeDefinitionAdapter } from './infrastructure/adapters/persistence/section-type-definition.adapter';
import { SystemThemesAdapter } from './infrastructure/adapters/system-themes.adapter';
import { AdminOnboardingController } from './infrastructure/controllers/admin-onboarding.controller';
import { OnboardingController } from './infrastructure/controllers/onboarding.controller';
import { OnboardingPreviewController } from './infrastructure/controllers/onboarding-preview.controller';
import { AdminOnboardingService } from './infrastructure/services/admin-onboarding.service';

@Module({
  imports: [PrismaModule, DslModule, forwardRef(() => ExportModule)],
  controllers: [OnboardingController, AdminOnboardingController, OnboardingPreviewController],
  providers: [
    SystemThemesAdapter,
    OnboardingConfigAdapter,
    OnboardingPreviewAdapter,
    AdminOnboardingService,
    { provide: SystemThemesPort, useExisting: SystemThemesAdapter },
    { provide: OnboardingConfigPort, useExisting: OnboardingConfigAdapter },
    { provide: PreviewRendererPort, useExisting: OnboardingPreviewAdapter },
    {
      provide: SectionTypeDefinitionPort,
      useFactory: (prisma: PrismaService) => new SectionTypeDefinitionAdapter(prisma),
      inject: [PrismaService],
    },
    {
      provide: ONBOARDING_PROGRESS_USE_CASES,
      useFactory: (prisma: PrismaService) => buildOnboardingProgressUseCases(prisma),
      inject: [PrismaService],
    },
    {
      provide: ONBOARDING_USE_CASES,
      useFactory: (prisma: PrismaService, logger: AppLoggerService, auditLog: AuditLogService) =>
        buildOnboardingUseCases(prisma, logger, auditLog),
      inject: [PrismaService, AppLoggerService, AuditLogService],
    },
  ],
  exports: [ONBOARDING_USE_CASES],
})
export class OnboardingModule {}
