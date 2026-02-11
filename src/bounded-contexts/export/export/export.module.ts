import { Module } from '@nestjs/common';
import { UsersModule } from '@/bounded-contexts/identity/users/users.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { ResumesModule } from '@/bounded-contexts/resumes/resumes/resumes.module';
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
import { PdfGeneratorService } from './services/pdf-generator.service';
import { PdfTemplateService } from './services/pdf-template.service';
import { ResumeDOCXService } from './services/resume-docx.service';
import { ResumeJsonService } from './services/resume-json.service';
import { ResumeLatexService } from './services/resume-latex.service';
import { ResumePDFService } from './services/resume-pdf.service';

@Module({
  imports: [ResumesModule, UsersModule, LoggerModule],
  controllers: [
    ExportBannerController,
    ExportPdfController,
    ExportDocxController,
    ExportMultiFormatController,
  ],
  providers: [
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
