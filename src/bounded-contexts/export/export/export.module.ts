/**
 * Export Module
 *
 * Multi-format resume export (PDF via Typst, DOCX, JSON, LaTeX, Banner).
 * PDF generation is server-side via Typst — no frontend dependency.
 * Banner capture still uses Puppeteer (BrowserManagerService).
 */

import { Module } from '@nestjs/common';
import { DslModule } from '@/bounded-contexts/dsl/dsl/dsl.module';
import { UsersModule } from '@/bounded-contexts/identity/users/users.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import { ResumesModule } from '@/bounded-contexts/resumes/resumes/resumes.module';
import { TypstCompilerService } from '../infrastructure/adapters/external-services/typst-compiler.service';
import { TypstDataSerializerService } from '../infrastructure/adapters/external-services/typst-data-serializer.service';
import { TypstPdfGeneratorService } from '../infrastructure/adapters/external-services/typst-pdf-generator.service';
import { GenericDocxSectionBuilder } from './builders/generic-docx-section.builder';
import {
  ExportBannerController,
  ExportDocxController,
  ExportMultiFormatController,
  ExportPdfController,
} from './controllers';
import { BannerCaptureService } from './services/banner-capture.service';
import { BrowserManagerService } from './services/browser-manager.service';
import { DocxBuilderService } from './services/docx-builder.service';
import { DocxSectionsService } from './services/docx-sections.service';
import { DocxStylesService } from './services/docx-styles.service';
import { ResumeDOCXService } from './services/resume-docx.service';
import { ResumeJsonService } from './services/resume-json.service';
import { ResumeLatexService } from './services/resume-latex.service';
import { ResumePDFService } from './services/resume-pdf.service';

@Module({
  imports: [ResumesModule, UsersModule, LoggerModule, PrismaModule, DslModule],
  controllers: [
    ExportBannerController,
    ExportPdfController,
    ExportDocxController,
    ExportMultiFormatController,
  ],
  providers: [
    // Shared-kernel repository for definition-driven export
    SectionTypeRepository,
    // Generic builder for definition-driven DOCX rendering
    GenericDocxSectionBuilder,
    // PDF (Typst - server-side, no frontend dependency)
    ResumePDFService,
    TypstPdfGeneratorService,
    TypstCompilerService,
    TypstDataSerializerService,
    // Banner (still uses Puppeteer)
    BannerCaptureService,
    BrowserManagerService,
    // DOCX
    ResumeDOCXService,
    DocxBuilderService,
    DocxSectionsService,
    DocxStylesService,
    // JSON & LaTeX
    ResumeJsonService,
    ResumeLatexService,
  ],
  exports: [
    BannerCaptureService,
    ResumePDFService,
    BrowserManagerService,
    ResumeDOCXService,
    ResumeJsonService,
    ResumeLatexService,
  ],
})
export class ExportModule {}
