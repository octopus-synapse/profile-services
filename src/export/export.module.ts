import { Module } from '@nestjs/common';
import {
  ExportBannerController,
  ExportPdfController,
  ExportDocxController,
  ExportMultiFormatController,
} from './controllers';
import { BannerCaptureService } from './services/banner-capture.service';
import { ResumePDFService } from './services/resume-pdf.service';
import { BrowserManagerService } from './services/browser-manager.service';
import { ResumeDOCXService } from './services/resume-docx.service';
import { DocxBuilderService } from './services/docx-builder.service';
import { DocxSectionsService } from './services/docx-sections.service';
import { DocxStylesService } from './services/docx-styles.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { PdfTemplateService } from './services/pdf-template.service';
import { ResumeJsonService } from './services/resume-json.service';
import { ResumeLatexService } from './services/resume-latex.service';
import { ExportRepository } from './repositories/export.repository';
import { ResumesModule } from '../resumes/resumes.module';
import { UsersModule } from '../users/users.module';
import { LoggerModule } from '../common/logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ResumesModule, UsersModule, LoggerModule, PrismaModule],
  controllers: [
    ExportBannerController,
    ExportPdfController,
    ExportDocxController,
    ExportMultiFormatController,
  ],
  providers: [
    ExportRepository,
    BannerCaptureService,
    ResumePDFService,
    BrowserManagerService,
    ResumeDOCXService,
    DocxBuilderService,
    DocxSectionsService,
    DocxStylesService,
    PdfGeneratorService,
    PdfTemplateService,
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
