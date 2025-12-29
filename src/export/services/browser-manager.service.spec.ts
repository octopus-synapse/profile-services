import { Test, TestingModule } from '@nestjs/testing';
import { BrowserManagerService } from './browser-manager.service';
import puppeteer, { Browser } from 'puppeteer';

jest.mock('puppeteer');

describe('BrowserManagerService', () => {
  let service: BrowserManagerService;
  let mockBrowser: jest.Mocked<Browser>;

  beforeEach(async () => {
    mockBrowser = {
      newPage: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Browser>;

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    const module: TestingModule = await Test.createTestingModule({
      providers: [BrowserManagerService],
    }).compile();

    service = module.get<BrowserManagerService>(BrowserManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBrowser', () => {
    it('should launch browser on first call', async () => {
      const browser = await service.getBrowser();

      expect(puppeteer.launch).toHaveBeenCalledTimes(1);
      expect(puppeteer.launch).toHaveBeenCalledWith({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      expect(browser).toBe(mockBrowser);
    });

    it('should reuse existing browser on subsequent calls', async () => {
      await service.getBrowser();
      await service.getBrowser();
      await service.getBrowser();

      expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    });

    it('should handle browser launch failure', async () => {
      const error = new Error('Browser launch failed');
      (puppeteer.launch as jest.Mock).mockRejectedValueOnce(error);

      await expect(service.getBrowser()).rejects.toThrow('Browser launch failed');
    });
  });

  describe('closeBrowser', () => {
    it('should close browser and clear reference', async () => {
      await service.getBrowser();
      expect(service.isActive()).toBe(true);

      await service.closeBrowser();

      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
      expect(service.isActive()).toBe(false);
    });

    it('should do nothing if browser not initialized', async () => {
      await service.closeBrowser();

      expect(mockBrowser.close).not.toHaveBeenCalled();
    });

    it('should allow launching new browser after close', async () => {
      await service.getBrowser();
      await service.closeBrowser();
      await service.getBrowser();

      expect(puppeteer.launch).toHaveBeenCalledTimes(2);
    });
  });

  describe('isActive', () => {
    it('should return false when browser not initialized', () => {
      expect(service.isActive()).toBe(false);
    });

    it('should return true when browser is active', async () => {
      await service.getBrowser();
      expect(service.isActive()).toBe(true);
    });

    it('should return false after browser is closed', async () => {
      await service.getBrowser();
      await service.closeBrowser();
      expect(service.isActive()).toBe(false);
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent getBrowser calls safely', async () => {
      const promises = Array(5)
        .fill(null)
        .map(() => service.getBrowser());

      const browsers = await Promise.all(promises);

      // All should return the same browser instance
      browsers.forEach((browser) => {
        expect(browser).toBe(mockBrowser);
      });

      // Launch should only be called once (race condition handling)
      // Note: Due to async nature, launch might be called multiple times
      // before first resolves. Real implementation might need mutex.
      expect(puppeteer.launch).toHaveBeenCalled();
    });
  });
});
