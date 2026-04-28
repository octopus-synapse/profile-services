/**
 * Onboarding Module
 *
 * ADR-001: Flat Hexagonal Architecture.
 * Session/Commands API for backend-driven onboarding flow.
 *
 * Every endpoint — including the live preview SSE stream — is now
 * synthesized from `onboarding.routes.ts`.
 */

import { forwardRef, Module } from '@nestjs/common';
import { DslUseCases } from '@/bounded-contexts/dsl';
import { DslModule } from '@/bounded-contexts/dsl/dsl.module';
import { ExportModule } from '@/bounded-contexts/export/export.module';
import { TypstCompilerService } from '@/bounded-contexts/export/infrastructure/adapters/external-services/typst-compiler.service';
import { TypstDataSerializerService } from '@/bounded-contexts/export/infrastructure/adapters/external-services/typst-data-serializer.service';
import { AuditLogService } from '@/bounded-contexts/platform/common/audit/audit-log.service';
import { CacheLockService } from '@/bounded-contexts/platform/common/cache/cache-lock.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import { buildOnboardingUseCases } from './application/compositions/onboarding.composition';
import { buildOnboardingProgressUseCases } from './application/compositions/onboarding-progress.composition';
import { OnboardingHttpBundle } from './application/ports/onboarding-http.bundle';
import { OnboardingUseCases } from './domain/ports/onboarding.port';
import { OnboardingConfigPort } from './domain/ports/onboarding-config.port';
import { OnboardingProgressUseCases } from './domain/ports/onboarding-progress.port';
import { PreviewRendererPort } from './domain/ports/preview-renderer.port';
import { SectionTypeDefinitionPort } from './domain/ports/section-type-definition.port';
import { SystemThemesPort } from './domain/ports/system-themes.port';
import { OnboardingConfigAdapter } from './infrastructure/adapters/onboarding-config.adapter';
import { OnboardingPreviewAdapter } from './infrastructure/adapters/onboarding-preview.adapter';
import { SectionTypeDefinitionAdapter } from './infrastructure/adapters/persistence/section-type-definition.adapter';
import { SystemThemesAdapter } from './infrastructure/adapters/system-themes.adapter';
import { AdminOnboardingService } from './infrastructure/services/admin-onboarding.service';
import { onboardingRoutes } from './onboarding.routes';

@Module({
  imports: [PrismaModule, DslModule, forwardRef(() => ExportModule)],
  controllers: [...synthesizeRouteControllers(OnboardingHttpBundle, onboardingRoutes)],
  providers: [
    SystemThemesAdapter,
    OnboardingConfigAdapter,
    {
      provide: OnboardingPreviewAdapter,
      useFactory: (
        prisma: PrismaService,
        dsl: DslUseCases,
        serializer: TypstDataSerializerService,
        compiler: TypstCompilerService,
      ) => new OnboardingPreviewAdapter(prisma, dsl, serializer, compiler),
      inject: [PrismaService, DslUseCases, TypstDataSerializerService, TypstCompilerService],
    },
    {
      provide: 'ONBOARDING_PREVIEW_ADAPTER_INIT',
      useFactory: async (svc: OnboardingPreviewAdapter) => {
        await svc.init?.();
        return true;
      },
      inject: [OnboardingPreviewAdapter],
    },
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
      provide: OnboardingProgressUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildOnboardingProgressUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: OnboardingUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort, auditLog: AuditLogService) =>
        buildOnboardingUseCases(prisma, logger, auditLog),
      inject: [PrismaService, LoggerPort, AuditLogService],
    },
    // Bundle: aggregates the HTTP-facing dependencies into a single
    // DI token consumed by the synthesized route controllers.
    {
      provide: OnboardingHttpBundle,
      useFactory: (
        useCases: OnboardingUseCases,
        progress: OnboardingProgressUseCases,
        systemThemes: SystemThemesPort,
        config: OnboardingConfigPort,
        sectionTypes: SectionTypeDefinitionPort,
        cacheLock: CacheLockService,
        sseStream: SseStreamPort,
        admin: AdminOnboardingService,
        previewRenderer: PreviewRendererPort,
      ): OnboardingHttpBundle => ({
        useCases,
        progress,
        systemThemes,
        config,
        sectionTypes,
        cacheLock,
        sseStream,
        admin,
        previewRenderer,
      }),
      inject: [
        OnboardingUseCases,
        OnboardingProgressUseCases,
        SystemThemesPort,
        OnboardingConfigPort,
        SectionTypeDefinitionPort,
        CacheLockService,
        SseStreamPort,
        AdminOnboardingService,
        PreviewRendererPort,
      ],
    },
  ],
  exports: [OnboardingUseCases],
})
export class OnboardingModule {}
