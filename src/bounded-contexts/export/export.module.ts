/**
 * Export Module
 *
 * ADR-001: Flat Hexagonal Architecture.
 * Multi-format resume export (PDF, DOCX, JSON, LaTeX, Banner).
 */

import { Module } from '@nestjs/common';
import { UsersModule } from '@/bounded-contexts/identity/users/users.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/shared-kernel/infrastructure/repositories';
import { ResumesModule as ResumesCoreModule } from '@/bounded-contexts/resumes/resumes/resumes.module';

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
import { PdfGeneratorService } from './infrastructure/adapters/external-services/pdf-generator.service';
import { PdfTemplateService } from './infrastructure/adapters/external-services/pdf-template.service';

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
        pdfGenerator: PdfGeneratorService,
        sectionTypeRepo: SectionTypeRepository,
      ) => buildExportUseCases(prisma, docxBuilder, pdfGenerator, sectionTypeRepo),
      inject: [PrismaService, DocxBuilderService, PdfGeneratorService, SectionTypeRepository],
    },
    // Infrastructure
    SectionTypeRepository,
    GenericDocxSectionBuilder,
    BannerCaptureService,
    BrowserManagerService,
    DocxBuilderService,
    DocxSectionsService,
    DocxStylesService,
    PdfGeneratorService,
    PdfTemplateService,
  ],
  exports: [EXPORT_USE_CASES, BannerCaptureService, BrowserManagerService],
})
export class ExportModule {}
