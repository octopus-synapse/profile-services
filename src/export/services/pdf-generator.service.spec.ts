/**
 * PdfGeneratorService Tests
 *
 * NOTA (Uncle Bob): Testes focam em comportamento observável.
 * Como PDF generation envolve Puppeteer, usamos stubs para isolar.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorService } from './pdf-generator.service';
import { BrowserManagerService } from './browser-manager.service';
import { PdfTemplateService } from './pdf-template.service';

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  const mockPage = {
    close: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
    evaluate: jest.fn().mockResolvedValue(297), // A4 height in mm
  };

  const mockBrowser = {
    newPage: jest.fn().mockResolvedValue(mockPage),
  };

  const mockPageSetup = {
    setupPage: jest.fn().mockResolvedValue(undefined),
    buildResumeUrl: jest.fn().mockReturnValue('http://localhost:3000/resume'),
    navigateToPage: jest.fn().mockResolvedValue(undefined),
    waitForResumeReady: jest.fn().mockResolvedValue(undefined),
  };

  const mockStyleExtractor = {
    extractStyles: jest.fn().mockResolvedValue({ css: '', fonts: [] }),
    renderCleanPage: jest.fn().mockResolvedValue(undefined),
  };

  const stubBrowserManager = {
    getBrowser: jest.fn().mockResolvedValue(mockBrowser),
  };

  const stubTemplateService = {
    getPageSetup: jest.fn().mockReturnValue(mockPageSetup),
    getStyleExtractor: jest.fn().mockReturnValue(mockStyleExtractor),
    getPdfConfig: jest.fn().mockReturnValue({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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

      await expect(service.generate()).rejects.toThrow('PDF error');
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should pass options to URL builder', async () => {
      const options = { palette: 'dark', lang: 'pt-BR' };

      await service.generate(options);

      expect(mockPageSetup.buildResumeUrl).toHaveBeenCalledWith(options);
    });
  });
});
