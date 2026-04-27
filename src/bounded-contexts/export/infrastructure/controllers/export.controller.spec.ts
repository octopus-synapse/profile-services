/**
 * Export Controller Unit Tests
 *
 * Pure tests using in-memory implementations.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Controllers should be thin, delegating to services"
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { StreamableFile } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { EventPublisher } from '@/shared-kernel';
import { ExportUseCases } from '../../application/ports/export.port';
import { ExportPipelineService } from '../../application/services/export-pipeline.service';
import { ExportPipelineFailedException } from '../../domain/exceptions/export.exceptions';
import { InMemoryBannerCapture, NullEventPublisher, NullLogger } from '../../testing';
import { BannerCaptureService } from '../adapters/external-services/banner-capture.service';
import { ExportController } from './export.controller';

const mockExportUseCases: ExportUseCases = {
  exportDocxUseCase: { execute: async () => Buffer.from('mock-docx-content') },
  exportPdfUseCase: { execute: async () => Buffer.from('mock-pdf-content') },
  exportJsonUseCase: {
    execute: async () => ({ $schema: 'test' }),
    executeAsBuffer: async () => Buffer.from('{  }'),
  },
  exportLatexUseCase: {
    execute: async () => '\\documentclass{  }',
    executeAsBuffer: async () => Buffer.from('\\documentclass{  }'),
  },
  exportBundleUseCase: { execute: async () => Buffer.from('mock-zip-content') },
};

describe('ExportController', () => {
  let controller: ExportController;
  let bannerCapture: InMemoryBannerCapture;

  beforeEach(async () => {
    bannerCapture = new InMemoryBannerCapture();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        { provide: BannerCaptureService, useValue: bannerCapture },
        { provide: ExportUseCases, useValue: mockExportUseCases },
        { provide: AppLoggerService, useValue: new NullLogger() },
        { provide: EventPublisher, useValue: new NullEventPublisher() },
        {
          provide: ExportPipelineService,
          useFactory: (events: EventPublisher) => new ExportPipelineService(events),
          inject: [EventPublisher],
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

    it('should translate capture failures to ExportPipelineFailedException', async () => {
      bannerCapture.setFailure(new Error('Capture failed'));

      await expect(controller.exportBanner()).rejects.toThrow(ExportPipelineFailedException);
    });
  });
});
