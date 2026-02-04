/**
 * Export Controller Unit Tests
 *
 * Tests the export controller endpoints for PDF, DOCX, and banner generation.
 * Focus: Request handling, file streaming, error handling.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ExportController } from './export.controller';
import type { BannerCaptureService } from './services/banner-capture.service';
import type { ResumePDFService } from './services/resume-pdf.service';
import type { ResumeDOCXService } from './services/resume-docx.service';
import type { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import type { EventPublisher } from '@/shared-kernel';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { StreamableFile, InternalServerErrorException } from '@nestjs/common';

describe('ExportController', () => {
  let controller: ExportController;
  let mockBannerCaptureService: Partial<BannerCaptureService>;
  let mockResumePDFService: Partial<ResumePDFService>;
  let mockResumeDOCXService: Partial<ResumeDOCXService>;
  let mockLogger: Partial<AppLoggerService>;
  let mockEventPublisher: Partial<EventPublisher>;

  const _mockUser: UserPayload = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  const _mockResumeId = 'resume-456';
  const mockPdfBuffer = Buffer.from('mock-pdf-content');
  const mockDocxBuffer = Buffer.from('mock-docx-content');
  const mockPngBuffer = Buffer.from('mock-png-content');

  beforeEach(() => {
    mockBannerCaptureService = {
      capture: mock(() => Promise.resolve(mockPngBuffer)),
    };

    mockResumePDFService = {
      generatePDF: mock(() => Promise.resolve(mockPdfBuffer)),
    };

    mockResumeDOCXService = {
      generateDOCX: mock(() => Promise.resolve(mockDocxBuffer)),
    };

    mockLogger = {
      setContext: mock(() => {}),
      log: mock(() => {}),
      error: mock(() => {}),
      errorWithMeta: mock(() => {}),
    };

    mockEventPublisher = {
      publish: mock(() => {}),
    };

    controller = new ExportController(
      mockBannerCaptureService as BannerCaptureService,
      mockResumePDFService as ResumePDFService,
      mockResumeDOCXService as ResumeDOCXService,
      mockLogger as AppLoggerService,
      mockEventPublisher as EventPublisher,
    );
  });

  describe('exportBanner', () => {
    it('should return streamable file with PNG buffer', async () => {
      const result = await controller.exportBanner();

      expect(result).toBeInstanceOf(StreamableFile);
      expect(mockBannerCaptureService.capture).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('should pass palette and logo options to service', async () => {
      await controller.exportBanner('ocean', 'https://example.com/logo.png');

      expect(mockBannerCaptureService.capture).toHaveBeenCalledWith(
        'ocean',
        'https://example.com/logo.png',
      );
    });

    it('should throw InternalServerErrorException on capture failure', async () => {
      (
        mockBannerCaptureService.capture as ReturnType<typeof mock>
      ).mockRejectedValue(new Error('Capture failed'));

      await expect(controller.exportBanner()).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockLogger.errorWithMeta).toHaveBeenCalled();
    });
  });
});
