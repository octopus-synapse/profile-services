import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResumePDFService } from './resume-pdf.service';
import { BrowserManagerService } from './browser-manager.service';
import { createMockPage, createMockBrowser, MockPage, MockBrowser } from '../__mocks__/puppeteer.mock';
import { VIEWPORT, TIMEOUT, DEFAULT } from '../constants/ui.constants';

describe('ResumePDFService', () => {
  let service: ResumePDFService;
  let browserManagerService: jest.Mocked<BrowserManagerService>;
  let configService: jest.Mocked<ConfigService>;
  let mockPage: MockPage;
  let mockBrowser: MockBrowser;

  beforeEach(async () => {
    mockPage = createMockPage();
    mockBrowser = createMockBrowser(mockPage);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumePDFService,
        {
          provide: BrowserManagerService,
          useValue: {
            getBrowser: jest.fn().mockResolvedValue(mockBrowser),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string | number> = {
                FRONTEND_HOST: 'localhost',
                FRONTEND_PORT: 3000,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ResumePDFService>(ResumePDFService);
    browserManagerService = module.get(BrowserManagerService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate PDF for valid resume with default options', async () => {
      // Setup successful page evaluation
      mockPage.evaluate.mockResolvedValue({
        linkTags: ['<link rel="stylesheet" href="/styles.css">'],
        styleTags: ['<style>body { margin: 0; }</style>'],
        resumeHTML: '<div id="resume" data-ready="1">Content</div>',
        cssVars: '--accent: #333;',
      });
      mockPage.pdf.mockResolvedValue(Buffer.from('pdf-content'));

      const result = await service.generate();

      expect(result).toBeInstanceOf(Buffer);
      expect(browserManagerService.getBrowser).toHaveBeenCalled();
      expect(mockBrowser.newPage).toHaveBeenCalled();
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should use custom palette parameter', async () => {
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate({ palette: 'ocean' });

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('palette=ocean'),
        expect.any(Object),
      );
    });

    it('should use custom language parameter', async () => {
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate({ lang: 'en' });

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('lang=en'),
        expect.any(Object),
      );
    });

    it('should include bannerColor when provided', async () => {
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate({ bannerColor: 'blue' });

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('bannerColor=blue'),
        expect.any(Object),
      );
    });

    it('should include userId when provided', async () => {
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate({ userId: 'user-123' });

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('user=user-123'),
        expect.any(Object),
      );
    });

    it('should close page even on error', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      await expect(service.generate()).rejects.toThrow('Navigation failed');
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should handle page navigation timeout', async () => {
      mockPage.goto.mockRejectedValue(new Error('Timeout exceeded'));

      await expect(service.generate()).rejects.toThrow('Timeout exceeded');
    });

    it('should handle missing #resume element', async () => {
      mockPage.waitForSelector.mockRejectedValue(
        new Error('waiting for selector "#resume" failed: timeout'),
      );

      await expect(service.generate()).rejects.toThrow('waiting for selector');
    });

    it('should set correct viewport dimensions', async () => {
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate();

      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: VIEWPORT.RESUME.WIDTH,
        height: VIEWPORT.RESUME.HEIGHT,
        deviceScaleFactor: VIEWPORT.RESUME.SCALE_FACTOR,
      });
    });

    it('should wait for document fonts ready', async () => {
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate();

      expect(mockPage.evaluateHandle).toHaveBeenCalledWith('document.fonts.ready');
    });

    it('should emulate print media type', async () => {
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate();

      expect(mockPage.emulateMediaType).toHaveBeenCalledWith('print');
    });

    it('should use default host and port when not configured', async () => {
      configService.get.mockReturnValue(undefined);
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate();

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(`http://${DEFAULT.HOST}:${DEFAULT.PORT}`),
        expect.any(Object),
      );
    });
  });

  describe('buildResumeUrl', () => {
    it('should build URL with all parameters', async () => {
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate({
        palette: 'midnight',
        lang: 'pt-br',
        bannerColor: 'purple',
        userId: 'abc-123',
      });

      const call = mockPage.goto.mock.calls[0][0] as string;
      expect(call).toContain('palette=midnight');
      expect(call).toContain('lang=pt-br');
      expect(call).toContain('bannerColor=purple');
      expect(call).toContain('user=abc-123');
      expect(call).toContain('export=1');
    });

    it('should URL-encode special characters in parameters', async () => {
      mockPage.evaluate.mockResolvedValue({
        linkTags: [],
        styleTags: [],
        resumeHTML: '<div id="resume">Content</div>',
        cssVars: '',
      });

      await service.generate({ palette: 'color with spaces' });

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining('palette=color%20with%20spaces'),
        expect.any(Object),
      );
    });
  });

  describe('PDF generation options', () => {
    it('should generate PDF with correct dimensions', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce({
          linkTags: [],
          styleTags: [],
          resumeHTML: '<div id="resume">Content</div>',
          cssVars: '',
        })
        .mockResolvedValueOnce(300); // Content height in mm

      await service.generate();

      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          printBackground: true,
          width: '297mm',
          preferCSSPageSize: false,
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should take debug screenshot on navigation error', async () => {
      mockPage.goto.mockRejectedValue(new Error('Network error'));

      await expect(service.generate()).rejects.toThrow('Network error');
      expect(mockPage.screenshot).toHaveBeenCalled();
    });
  });
});
