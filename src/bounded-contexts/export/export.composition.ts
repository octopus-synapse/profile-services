/**
 * Pure-TS wiring for the export BC. Zero `@nestjs/*` imports.
 *
 * Returns a `BoundedContextComposition<ExportHttpBundle>` whose
 * `useCases` is the HTTP-facing bundle the synthesized routes consume:
 * `{ useCases: ExportUseCases, pipeline, bannerCapture, pdfCache }`.
 *
 * The Nest module shell (`export.module.ts`) drains this composition
 * via `useFactory`; the Elysia bootstrap will too once the BC is
 * added to the POC. Heavy collaborators (Typst pipeline, Puppeteer
 * banner capture, DOCX builder, PDF cache) are now POJOs — instantiated
 * here in the exact order the legacy module wired them.
 */

import type { DslUseCases } from '@/bounded-contexts/dsl';
import type { S3UploadService } from '@/bounded-contexts/platform/common/services/s3-upload.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ResumesRepository } from '@/bounded-contexts/resumes/core/resumes.repository';
import type { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { ConfigPort } from '@/shared-kernel/config';
import type { EventPublisher } from '@/shared-kernel/event-bus/event-publisher';
import { buildExportUseCases } from './application/compositions/export.composition';
import { ExportUseCases } from './application/ports/export.port';
import { ExportHttpBundle } from './application/ports/export-http.bundle';
import { ExportPipelineService } from './application/services/export-pipeline.service';
import { exportRoutes } from './export.routes';
import { AstHtmlRendererService } from './infrastructure/adapters/external-services/ast-html-renderer.service';
import { BannerCaptureService } from './infrastructure/adapters/external-services/banner-capture.service';
import { BrowserManagerService } from './infrastructure/adapters/external-services/browser-manager.service';
import { DocxBuilderService } from './infrastructure/adapters/external-services/docx-builder.service';
import { DocxSectionsService } from './infrastructure/adapters/external-services/docx-sections.service';
import { DocxStylesService } from './infrastructure/adapters/external-services/docx-styles.service';
import { ResumeHtmlGeneratorService } from './infrastructure/adapters/external-services/resume-html-generator.service';
import { TypstCompilerService } from './infrastructure/adapters/external-services/typst-compiler.service';
import { TypstDataSerializerService } from './infrastructure/adapters/external-services/typst-data-serializer.service';
import { TypstPdfGeneratorService } from './infrastructure/adapters/external-services/typst-pdf-generator.service';
import { UserDataAdapter } from './infrastructure/adapters/persistence/user-data.adapter';
import { PdfCacheService } from './infrastructure/services/pdf-cache.service';

export { ExportHttpBundle, ExportUseCases };

/**
 * Subset of `DslUseCases` the Typst pipeline consumes. Kept narrow so
 * the export BC doesn't have a build-time dependency on the dsl
 * module's full surface area (it's still a runtime cross-BC dep).
 */
export type ExportDslDeps = Pick<DslUseCases, 'renderResumeDsl'>;

export interface ExportCompositionDeps {
  readonly prisma: PrismaService;
  readonly resumesRepository: ResumesRepository;
  readonly sectionTypeRepo: SectionTypeRepository;
  readonly s3: S3UploadService;
  readonly config: ConfigPort;
  readonly eventPublisher: EventPublisher;
  readonly logger: LoggerPort;
  readonly dsl: ExportDslDeps;
}

export interface ExportInternals {
  readonly typstPdfGenerator: TypstPdfGeneratorService;
  readonly typstCompiler: TypstCompilerService;
  readonly typstDataSerializer: TypstDataSerializerService;
  readonly resumeHtmlGenerator: ResumeHtmlGeneratorService;
  readonly browserManager: BrowserManagerService;
  readonly bannerCapture: BannerCaptureService;
  readonly docxBuilder: DocxBuilderService;
  readonly pdfCache: PdfCacheService;
  readonly pipeline: ExportPipelineService;
  readonly useCases: ExportUseCases;
}

/**
 * Build all export BC singletons + the HTTP bundle. Returns the
 * intermediate POJOs alongside the final bundle so the Nest module
 * shell can re-export Typst services / browser manager / banner
 * capture / pdf cache to peer modules without re-instantiating them.
 */
export function buildExportInternals(deps: ExportCompositionDeps): ExportInternals {
  const { prisma, resumesRepository, sectionTypeRepo, s3, config, eventPublisher, logger, dsl } =
    deps;

  // Typst pipeline (server-side PDF)
  const typstCompiler = new TypstCompilerService(logger);
  const typstDataSerializer = new TypstDataSerializerService();
  const typstPdfGenerator = new TypstPdfGeneratorService(
    prisma,
    dsl,
    typstDataSerializer,
    typstCompiler,
    logger,
  );

  // Realtime HTML preview (same AST, no Typst/MinIO).
  const astHtmlRenderer = new AstHtmlRendererService();
  const resumeHtmlGenerator = new ResumeHtmlGeneratorService(prisma, dsl, astHtmlRenderer, logger);

  // Banner (Puppeteer)
  const browserManager = new BrowserManagerService(logger);
  const bannerCapture = new BannerCaptureService(browserManager, config, logger);

  // DOCX
  const userData = new UserDataAdapter(prisma);
  const docxStyles = new DocxStylesService();
  const docxSections = new DocxSectionsService(sectionTypeRepo);
  const docxBuilder = new DocxBuilderService(
    resumesRepository,
    userData,
    docxSections,
    docxStyles,
    sectionTypeRepo,
  );

  // PDF cache (MinIO-backed)
  const pdfCache = new PdfCacheService(prisma, s3, logger);

  // Pipeline (event lifecycle wrapper)
  const pipeline = new ExportPipelineService(eventPublisher);

  // Use cases
  const useCases = buildExportUseCases(
    prisma,
    docxBuilder,
    typstPdfGenerator,
    logger,
    sectionTypeRepo,
  );

  return {
    typstPdfGenerator,
    typstCompiler,
    typstDataSerializer,
    resumeHtmlGenerator,
    browserManager,
    bannerCapture,
    docxBuilder,
    pdfCache,
    pipeline,
    useCases,
  };
}

export interface ExportCompositionExtras {
  /** Cross-BC consumers (e.g. `onboarding`) need typst rendering. */
  readonly typstCompiler: TypstCompilerService;
  readonly typstDataSerializer: TypstDataSerializerService;
}

export function buildExportComposition(
  deps: ExportCompositionDeps,
): BoundedContextComposition<ExportHttpBundle> & ExportCompositionExtras {
  const internals = buildExportInternals(deps);
  const bundle: ExportHttpBundle = {
    useCases: internals.useCases,
    pipeline: internals.pipeline,
    bannerCapture: internals.bannerCapture,
    pdfCache: internals.pdfCache,
    resumeHtmlGenerator: internals.resumeHtmlGenerator,
    s3: deps.s3,
  };
  return {
    useCases: bundle,
    routes: exportRoutes,
    typstCompiler: internals.typstCompiler,
    typstDataSerializer: internals.typstDataSerializer,
  };
}
