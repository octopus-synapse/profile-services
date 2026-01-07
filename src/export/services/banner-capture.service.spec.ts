import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  mock,
  spyOn,
} from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BannerCaptureService } from './banner-capture.service';
import { BrowserManagerService } from './browser-manager.service';
import {
  createMockPage,
  createMockBrowser,
  createMockElementHandle,
  MockPage,
  MockBrowser,
  MockElementHandle,
} from '../__mocks__/puppeteer.mock';
import { VIEWPORT, TIMEOUT, DEFAULT } from '../constants/ui.constants';

describe('BannerCaptureService', () => {
  let service: BannerCaptureService;
  let browserManagerService: BrowserManagerService;
  let configService: ConfigService;
  let mockPage: MockPage;
  let mockBrowser: MockBrowser;
  let mockElementHandle: MockElementHandle;

  // Silence Nest logger during tests to reduce noise
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    console.error = mock();
    console.warn = mock();
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  beforeEach(async () => {
    mockPage = createMockPage();
    mockBrowser = createMockBrowser(mockPage);
    mockElementHandle = createMockElementHandle();

    // Setup page.$ to return element handle for #banner
    mockPage.$.mockResolvedValue(mockElementHandle);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BannerCaptureService,
        {
          provide: BrowserManagerService,
          useValue: {
            getBrowser: mock().mockResolvedValue(mockBrowser),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: mock((key: string) => {
              if (key === 'FRONTEND_HOST') return 'localhost';
              if (key === 'FRONTEND_PORT') return 3000;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BannerCaptureService>(BannerCaptureService);
    browserManagerService = module.get(BrowserManagerService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {});

  describe('capture', () => {
    it('should capture banner screenshot with default parameters', async () => {
      const result = await service.capture();

      expect(browserManagerService.getBrowser).toHaveBeenCalledTimes(1);
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: VIEWPORT.BANNER.WIDTH,
        height: VIEWPORT.BANNER.HEIGHT,
        deviceScaleFactor: VIEWPORT.BANNER.SCALE_FACTOR,
      });
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(
          `palette=${encodeURIComponent(DEFAULT.PALETTE)}`,
        ),
        expect.objectContaining({
          waitUntil: 'domcontentloaded',
          timeout: TIMEOUT.PAGE_LOAD,
        }),
      );
      expect(mockPage.close).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should capture banner screenshot with custom palette', async () => {
      const customPalette = 'dark-mode';
      await service.capture(customPalette);

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(`palette=${encodeURIComponent(customPalette)}`),
        expect.any(Object),
      );
    });

    it('should include logo URL when provided', async () => {
      const logoUrl = 'https://example.com/logo.png';
      await service.capture(DEFAULT.PALETTE, logoUrl);

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(`logo=${encodeURIComponent(logoUrl)}`),
        expect.any(Object),
      );
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '#company-logo',
        expect.objectContaining({ timeout: TIMEOUT.LOGO_LOAD }),
      );
    });

    it('should apply correct viewport dimensions', async () => {
      await service.capture();

      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: VIEWPORT.BANNER.WIDTH,
        height: VIEWPORT.BANNER.HEIGHT,
        deviceScaleFactor: VIEWPORT.BANNER.SCALE_FACTOR,
      });
    });

    it('should wait for code block rendering', async () => {
      await service.capture();

      expect(mockPage.waitForFunction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ timeout: TIMEOUT.CODE_BLOCK_RENDER }),
      );
    });

    it('should apply quality styles (antialiasing)', async () => {
      await service.capture();

      expect(mockPage.addStyleTag).toHaveBeenCalledWith({
        content: expect.stringContaining('-webkit-font-smoothing: antialiased'),
      });
    });

    it('should close page on success', async () => {
      await service.capture();

      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle #banner not found', async () => {
      mockPage.$.mockResolvedValueOnce(null);

      await expect(async () => await service.capture()).toThrow(
        'Banner element not found',
      );
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('should close page on navigation error', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));

      await expect(async () => await service.capture()).toThrow(
        'Navigation failed',
      );
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('should close page on selector timeout', async () => {
      mockPage.waitForSelector.mockRejectedValueOnce(
        new Error('Timeout waiting for selector'),
      );

      await expect(async () => await service.capture()).toThrow(
        'Timeout waiting for selector',
      );
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('should handle broken logo image (404)', async () => {
      const logoUrl = 'https://example.com/broken-logo.png';
      // Simulate logo element not complete (broken image)
      mockPage.waitForFunction.mockImplementation(
        (fn: unknown, options?: { timeout?: number }) => {
          // For code block check, resolve normally
          if (options?.timeout === TIMEOUT.CODE_BLOCK_RENDER) {
            return Promise.resolve();
          }
          // For logo check, reject with timeout
          return Promise.reject(new Error('Timeout waiting for logo'));
        },
      );

      await expect(
        async () => await service.capture(DEFAULT.PALETTE, logoUrl),
      ).toThrow('Timeout waiting for logo');
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('should take debug screenshot on navigation error', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));

      await expect(async () => await service.capture()).toThrow();

      // Debug screenshot should be taken before throwing
      expect(mockPage.screenshot).toHaveBeenCalled();
    });

    it('should take debug screenshot on selector wait error', async () => {
      mockPage.waitForSelector.mockRejectedValueOnce(
        new Error('Selector timeout'),
      );

      await expect(async () => await service.capture()).toThrow();

      // Multiple debug screenshots should be taken
      expect(mockPage.screenshot).toHaveBeenCalled();
    });
  });

  describe('URL building', () => {
    it('should use configured host and port', async () => {
      await service.capture();

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringMatching(/^http:\/\/localhost:3000\//),
        expect.any(Object),
      );
    });

    it('should use default host when not configured', async () => {
      (configService.get as any).mockImplementation((key: string) => {
        if (key === 'FRONTEND_HOST') return undefined;
        if (key === 'FRONTEND_PORT') return undefined;
        return undefined;
      });

      await service.capture();

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(`^http://${DEFAULT.HOST}:${DEFAULT.PORT}/`),
        ),
        expect.any(Object),
      );
    });

    it('should properly encode palette parameter', async () => {
      const specialPalette = 'my palette & special=chars';
      await service.capture(specialPalette);

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(specialPalette)),
        expect.any(Object),
      );
    });

    it('should properly encode logo URL parameter', async () => {
      const logoUrl = 'https://example.com/logo.png?v=1&size=large';
      await service.capture(DEFAULT.PALETTE, logoUrl);

      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining(`logo=${encodeURIComponent(logoUrl)}`),
        expect.any(Object),
      );
    });
  });

  describe('banner element capture', () => {
    it('should capture #banner element as PNG', async () => {
      await service.capture();

      expect(mockPage.$).toHaveBeenCalledWith('#banner');
      expect(mockElementHandle.screenshot).toHaveBeenCalledWith({
        encoding: 'binary',
        type: 'png',
        captureBeyondViewport: true,
        omitBackground: false,
      });
    });

    it('should return buffer from element screenshot', async () => {
      const expectedBuffer = Buffer.from('test-screenshot-data');
      mockElementHandle.screenshot.mockResolvedValueOnce(expectedBuffer);

      const result = await service.capture();

      expect(result).toBe(expectedBuffer);
    });
  });

  describe('wait for rendering', () => {
    it('should wait for fonts to load', async () => {
      await service.capture();

      expect(mockPage.evaluateHandle).toHaveBeenCalledWith(
        'document.fonts.ready',
      );
    });

    it('should wait for #banner selector', async () => {
      await service.capture();

      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '#banner',
        expect.objectContaining({ timeout: TIMEOUT.SELECTOR_WAIT }),
      );
    });

    it('should wait for #company-logo when logo URL provided', async () => {
      const logoUrl = 'https://example.com/logo.png';
      await service.capture(DEFAULT.PALETTE, logoUrl);

      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        '#company-logo',
        expect.objectContaining({ timeout: TIMEOUT.LOGO_LOAD }),
      );
    });

    it('should not wait for logo when no logo URL provided', async () => {
      await service.capture();

      // Should only wait for #banner, not #company-logo
      const waitForSelectorCalls = mockPage.waitForSelector.mock.calls;
      const logoWaitCall = waitForSelectorCalls.find(
        (call) => call[0] === '#company-logo',
      );
      expect(logoWaitCall).toBeUndefined();
    });
  });
});
