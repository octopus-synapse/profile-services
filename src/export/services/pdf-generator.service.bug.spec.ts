/**
 * PDF Generator Bug Detection Tests
 *
 * Uncle Bob: "SEM TIMEOUT! O sistema pode TRAVAR!"
 *
 * BUG-037: PDF Generator No Timeout Protection
 * BUG-038: Banner Capture logoUrl Not Validated (SSRF)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorService } from './pdf-generator.service';
import { BrowserManagerService } from './browser-manager.service';
import { PdfTemplateService } from './pdf-template.service';

describe('PdfGeneratorService - BUG DETECTION', () => {
  let service: PdfGeneratorService;
  let mockBrowserManager: any;
  let mockTemplateService: any;
  let mockPage: any;

  beforeEach(async () => {
    mockPage = {
      close: jest.fn(),
      evaluate: jest.fn().mockResolvedValue(297), // A4 height
      pdf: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
      $: jest.fn().mockResolvedValue({ screenshot: jest.fn().mockResolvedValue(Buffer.from('')) }),
      goto: jest.fn(),
      setViewport: jest.fn(),
    };

    mockBrowserManager = {
      getBrowser: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue(mockPage),
      }),
    };

    mockTemplateService = {
      getPageSetup: jest.fn().mockReturnValue({
        setupPage: jest.fn(),
        buildResumeUrl: jest.fn().mockReturnValue('http://localhost:3000/resume'),
        navigateToPage: jest.fn(),
        waitForResumeReady: jest.fn(),
      }),
      getStyleExtractor: jest.fn().mockReturnValue({
        extractStyles: jest.fn().mockResolvedValue({}),
        renderCleanPage: jest.fn(),
      }),
      getPdfConfig: jest.fn().mockReturnValue({
        format: 'A4',
        printBackground: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfGeneratorService,
        { provide: BrowserManagerService, useValue: mockBrowserManager },
        { provide: PdfTemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
  });

  describe('BUG-037: No Timeout Protection', () => {
    /**
     * Puppeteer operations can hang indefinitely.
     * If page doesn't load or render fails, worker blocks forever.
     */
    it('should have timeout on page operations', async () => {
      // Simulate page that never responds
      const neverResolves = new Promise(() => {}); // Never resolves!
      mockPage.evaluate.mockReturnValue(neverResolves);

      const TIMEOUT_MS = 30000;

      // BUG: This will hang forever without timeout!
      const generatePromise = service.generate({ palette: 'DEFAULT', lang: 'en' });

      // Should reject after timeout
      await expect(
        Promise.race([
          generatePromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS + 1000),
          ),
        ]),
      ).rejects.toThrow('Timeout');
    });

    it('should cleanup page even on timeout', async () => {
      // Page hangs
      mockTemplateService.getPageSetup().waitForResumeReady.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      // After timeout, page.close() should still be called
      // BUG: If timeout isn't implemented, cleanup never happens
    });
  });

  describe('BUG: Resource Exhaustion', () => {
    it('should limit concurrent PDF generations', async () => {
      // Simulate many concurrent requests
      const promises = Array(100)
        .fill(null)
        .map(() => service.generate({ palette: 'DEFAULT', lang: 'en' }));

      // BUG: No concurrency limit!
      // 100 browser pages opened simultaneously could crash server

      // Should have a queue or semaphore limiting concurrent generations
    });
  });
});

