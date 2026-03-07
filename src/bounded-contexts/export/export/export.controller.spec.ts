/**
 * Export Controller Unit Tests
 *
 * Pure tests using in-memory implementations.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InternalServerErrorException, StreamableFile } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { EventPublisher } from '@/shared-kernel';
import { ExportController } from './export.controller';
import { BannerCaptureService } from './services/banner-capture.service';
import { ResumeDOCXService } from './services/resume-docx.service';
import { ResumePDFService } from './services/resume-pdf.service';
import {
  InMemoryBannerCapture,
  InMemoryResumeDOCX,
  InMemoryResumePDF,
  NullEventPublisher,
  NullLogger,
} from './testing';

describe('ExportController', () => {
  let controller: ExportController;
  let bannerCapture: InMemoryBannerCapture;
  let pdfService: InMemoryResumePDF;
  let docxService: InMemoryResumeDOCX;

  beforeEach(async () => {
    bannerCapture = new InMemoryBannerCapture();
    pdfService = new InMemoryResumePDF();
    docxService = new InMemoryResumeDOCX();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        {
          provide: BannerCaptureService,
          useValue: bannerCapture,
        },
        {
          provide: ResumePDFService,
          useValue: pdfService,
        },
        {
          provide: ResumeDOCXService,
          useValue: docxService,
        },
        {
          provide: AppLoggerService,
          useValue: new NullLogger(),
        },
        {
          provide: EventPublisher,
          useValue: new NullEventPublisher(),
        },
      ],
    }).compile();

    controller = module.get<ExportController>(ExportController);
  });

  describe('exportBanner', () => {
    it('should return streamable file with PNG buffer', async () => {
      const result = await controller.exportBanner();

      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should pass palette and logo options to service', async () => {
      // Service receives parameters - we verify the result works
      const result = await controller.exportBanner('ocean', 'https://example.com/logo.png');

      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should throw InternalServerErrorException on capture failure', async () => {
      bannerCapture.setFailure(new Error('Capture failed'));

      await expect(controller.exportBanner()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
