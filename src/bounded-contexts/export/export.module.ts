/**
 * Export Module
 *
 * ADR-001: Flat Hexagonal Architecture.
 * Multi-format resume export (PDF via Typst, DOCX, JSON, LaTeX, Banner).
 *
 * PDF generation is server-side via Typst — no frontend dependency.
 * Banner capture still uses Puppeteer (BrowserManagerService).
 */

import { Module } from '@nestjs/common';
import { UsersModule } from '@/bounded-contexts/identity/users/users.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumesModule as ResumesCoreModule } from '@/bounded-contexts/resumes/resumes/resumes.module';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/shared-kernel/infrastructure/repositories';

// Application Compositions (Clean Architecture)
import {
  buildExportUseCases,
  EXPORT_USE_CASES,
} from './application/compositions/export.composition';

// Infrastructure Adapters (external services)
import { BannerCaptureService } from './infrastructure/adapters/external-services/banner-capture.service';
import { BrowserManagerService } from './infrastructure/adapters/external-services/browser-manager.service';
import { DocxBuilderService } from './infrastructure/adapters/external-services/docx-builder.service';
import { DocxSectionsService } from './infrastructure/adapters/external-services/docx-sections.service';
import { DocxStylesService } from './infrastructure/adapters/external-services/docx-styles.service';
import { TypstCompilerService } from './infrastructure/adapters/external-services/typst-compiler.service';
import { TypstDataSerializerService } from './infrastructure/adapters/external-services/typst-data-serializer.service';
import { TypstPdfGeneratorService } from './infrastructure/adapters/external-services/typst-pdf-generator.service';

// Infrastructure (builders, controllers)
import { GenericDocxSectionBuilder } from './infrastructure/builders/generic-docx-section.builder';
import {
  ExportBannerController,
  ExportDocxController,
  ExportMultiFormatController,
  ExportPdfController,
} from './infrastructure/controllers';

@Module({
  imports: [ResumesCoreModule, UsersModule, LoggerModule, PrismaModule],
  controllers: [
    ExportBannerController,
    ExportPdfController,
    ExportDocxController,
    ExportMultiFormatController,
  ],
  providers: [
    // Use Cases (Clean Architecture)
    {
      provide: EXPORT_USE_CASES,
      useFactory: (
        prisma: PrismaService,
        docxBuilder: DocxBuilderService,
        pdfGenerator: TypstPdfGeneratorService,
        sectionTypeRepo: SectionTypeRepository,
      ) => buildExportUseCases(prisma, docxBuilder, pdfGenerator, sectionTypeRepo),
      inject: [PrismaService, DocxBuilderService, TypstPdfGeneratorService, SectionTypeRepository],
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
  ],
  exports: [EXPORT_USE_CASES, BannerCaptureService, BrowserManagerService],
})
export class ExportModule {}
