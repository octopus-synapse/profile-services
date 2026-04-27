/**
 * Export Module
 *
 * ADR-001: Flat Hexagonal Architecture.
 * Multi-format resume export (PDF via Typst, DOCX, JSON, LaTeX, Banner).
 *
 * PDF generation is server-side via Typst — no frontend dependency.
 * Banner capture still uses Puppeteer (BrowserManagerService).
 *
 * HTTP surface comes from `export.routes.ts` — synthesized at boot.
 * Stream content-types are declared via `route.headers`; handlers
 * return `StreamableFile` which passes through the synthesizer's
 * `Res({ passthrough: true })` mode unchanged.
 */

import { Module } from '@nestjs/common';
import { DslModule } from '@/bounded-contexts/dsl/dsl.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import { FeatureFlagsModule } from '@/bounded-contexts/platform/feature-flags/feature-flags.module';
import {
  FEATURE_FLAG_KEY,
  FeatureFlagGuard,
} from '@/bounded-contexts/platform/feature-flags/infrastructure/guards/feature-flag.guard';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumesCoreModule } from '@/bounded-contexts/resumes/core/resumes.module';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { EventPublisher } from '@/shared-kernel/event-bus/event-publisher';

// Application Compositions (Clean Architecture)
import { buildExportUseCases } from './application/compositions/export.composition';
import { ExportUseCases } from './application/ports/export.port';
import { ExportHttpBundle } from './application/ports/export-http.bundle';
import { ExportPipelineService } from './application/services/export-pipeline.service';
import { UserDataPort } from './domain/ports/user-data.port';
import { exportRoutes } from './export.routes';
// Infrastructure Adapters (external services)
import { BannerCaptureService } from './infrastructure/adapters/external-services/banner-capture.service';
import { BrowserManagerService } from './infrastructure/adapters/external-services/browser-manager.service';
import { DocxBuilderService } from './infrastructure/adapters/external-services/docx-builder.service';
import { DocxSectionsService } from './infrastructure/adapters/external-services/docx-sections.service';
import { DocxStylesService } from './infrastructure/adapters/external-services/docx-styles.service';
import { TypstCompilerService } from './infrastructure/adapters/external-services/typst-compiler.service';
import { TypstDataSerializerService } from './infrastructure/adapters/external-services/typst-data-serializer.service';
import { TypstPdfGeneratorService } from './infrastructure/adapters/external-services/typst-pdf-generator.service';
import { UserDataAdapter } from './infrastructure/adapters/persistence/user-data.adapter';
// Infrastructure (builders, services)
import { GenericDocxSectionBuilder } from './infrastructure/builders/generic-docx-section.builder';
import { PdfCacheService } from './infrastructure/services/pdf-cache.service';

@Module({
  imports: [ResumesCoreModule, LoggerModule, PrismaModule, DslModule, FeatureFlagsModule],
  controllers: [
    ...synthesizeRouteControllers(ExportHttpBundle, exportRoutes, {
      guards: {
        'feature-flag': {
          guard: FeatureFlagGuard,
          metadataKey: FEATURE_FLAG_KEY,
          mapMetadata: (metadata) => (metadata as { key?: string } | undefined)?.key ?? metadata,
        },
      },
    }),
  ],
  providers: [
    // Use Cases (Clean Architecture)
    {
      provide: ExportUseCases,
      useFactory: (
        prisma: PrismaService,
        docxBuilder: DocxBuilderService,
        pdfGenerator: TypstPdfGeneratorService,
        logger: LoggerPort,
        sectionTypeRepo: SectionTypeRepository,
      ) => buildExportUseCases(prisma, docxBuilder, pdfGenerator, logger, sectionTypeRepo),
      inject: [
        PrismaService,
        DocxBuilderService,
        TypstPdfGeneratorService,
        LoggerPort,
        SectionTypeRepository,
      ],
    },
    {
      provide: ExportPipelineService,
      useFactory: (events: EventPublisher) => new ExportPipelineService(events),
      inject: [EventPublisher],
    },
    // Infrastructure - Typst (server-side PDF)
    TypstPdfGeneratorService,
    TypstCompilerService,
    TypstDataSerializerService,
    // Infrastructure - Banner (still uses Puppeteer)
    BannerCaptureService,
    BrowserManagerService,
    // Infrastructure - DOCX
    SectionTypeRepository,
    GenericDocxSectionBuilder,
    DocxBuilderService,
    DocxSectionsService,
    DocxStylesService,
    UserDataAdapter,
    { provide: UserDataPort, useExisting: UserDataAdapter },
    // PDF cache: stores rendered Typst output in MinIO keyed on
    // resume + style + version + content-hash so re-downloads skip
    // the Typst compile path entirely.
    S3UploadService,
    PdfCacheService,
    // HTTP-facing bundle the synthesized route controllers depend on.
    {
      provide: ExportHttpBundle,
      useFactory: (
        useCases: ExportUseCases,
        pipeline: ExportPipelineService,
        bannerCapture: BannerCaptureService,
        pdfCache: PdfCacheService,
      ): ExportHttpBundle => ({ useCases, pipeline, bannerCapture, pdfCache }),
      inject: [ExportUseCases, ExportPipelineService, BannerCaptureService, PdfCacheService],
    },
  ],
  exports: [
    ExportUseCases,
    BannerCaptureService,
    BrowserManagerService,
    TypstPdfGeneratorService,
    TypstCompilerService,
    TypstDataSerializerService,
    PdfCacheService,
  ],
})
export class ExportModule {}
