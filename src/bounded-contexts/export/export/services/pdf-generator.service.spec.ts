/**
 * PdfGeneratorService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável.
 * Como PDF generation envolve Puppeteer, usamos stubs para isolar.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorService } from './pdf-generator.service';
import { BrowserManagerService } from './browser-manager.service';
import { PdfTemplateService } from './pdf-template.service';

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  const mockPage = {
    close: mock().mockResolvedValue(undefined),
    pdf: mock().mockResolvedValue(Buffer.from('mock-pdf-content')),
    evaluate: mock().mockResolvedValue(297), // A4 height in mm
  };

  const mockBrowser = {
    newPage: mock().mockResolvedValue(mockPage),
  };

  const mockPageSetup = {
    setupPage: mock().mockResolvedValue(undefined),
    buildResumeUrl: mock().mockReturnValue('http://localhost:3000/resume'),
    navigateToPage: mock().mockResolvedValue(undefined),
    waitForResumeReady: mock().mockResolvedValue(undefined),
  };

  const mockStyleExtractor = {
    extractStyles: mock().mockResolvedValue({ css: '', fonts: [] }),
    renderCleanPage: mock().mockResolvedValue(undefined),
  };

  const stubBrowserManager = {
    getBrowser: mock().mockResolvedValue(mockBrowser),
  };

  const stubTemplateService = {
    getPageSetup: mock().mockReturnValue(mockPageSetup),
    getStyleExtractor: mock().mockReturnValue(mockStyleExtractor),
    getPdfConfig: mock().mockReturnValue({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfGeneratorService,
        { provide: BrowserManagerService, useValue: stubBrowserManager },
        { provide: PdfTemplateService, useValue: stubTemplateService },
      ],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  describe('generate', () => {
    it('should return PDF buffer', async () => {
      const result = await service.generate();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should setup page before navigation', async () => {
      await service.generate();

      expect(mockPageSetup.setupPage).toHaveBeenCalledWith(mockPage);
    });

    it('should wait for resume to be ready', async () => {
      await service.generate();

      expect(mockPageSetup.waitForResumeReady).toHaveBeenCalledWith(mockPage);
    });

    it('should extract and apply styles', async () => {
      await service.generate();

      expect(mockStyleExtractor.extractStyles).toHaveBeenCalledWith(mockPage);
      expect(mockStyleExtractor.renderCleanPage).toHaveBeenCalled();
    });

    it('should close page after generation', async () => {
      await service.generate();

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should close page even on error', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('PDF error'));

      await expect(async () => await service.generate()).toThrow('PDF error');
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should pass options to URL builder', async () => {
      const options = { palette: 'dark', lang: 'pt-BR' };

      await service.generate(options);

      expect(mockPageSetup.buildResumeUrl).toHaveBeenCalledWith(options);
    });
  });
});
