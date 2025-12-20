import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { BannerCaptureService } from './services/banner-capture.service';
import { ResumePDFService } from './services/resume-pdf.service';
import { BrowserManagerService } from './services/browser-manager.service';
import { ResumeDOCXService } from './services/resume-docx.service';
import { ResumesModule } from '../resumes/resumes.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ResumesModule, UsersModule],
  controllers: [ExportController],
  providers: [
    BannerCaptureService,
    ResumePDFService,
    BrowserManagerService,
    ResumeDOCXService,
  ],
  exports: [
    BannerCaptureService,
    ResumePDFService,
    BrowserManagerService,
    ResumeDOCXService,
  ],
})
export class ExportModule {}
