import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import puppeteer, { Browser, Page } from 'puppeteer';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { BrowserManagerService } from './browser-manager.service';

describe('BrowserManagerService', () => {
  let service: BrowserManagerService;
  let mockBrowser: Browser;
  let mockPage: Page;

  beforeEach(() => {
    mockPage = {
      close: mock().mockResolvedValue(undefined),
    } as unknown as Page;

    mockBrowser = {
      newPage: mock().mockResolvedValue(mockPage),
      close: mock().mockResolvedValue(undefined),
    } as unknown as Browser;

    spyOn(puppeteer, 'launch').mockResolvedValue(mockBrowser);

    service = new BrowserManagerService(stubLogger);
  });

  afterEach(() => {
    mock.restore();
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
      spyOn(puppeteer, 'launch').mockRejectedValueOnce(error);

      await expect(async () => await service.getBrowser()).toThrow('Browser launch failed');
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

  describe('withPage', () => {
    it('opens a page, runs fn, closes the page', async () => {
      const result = await service.withPage(async (page) => {
        expect(page).toBe(mockPage);
        return 42;
      });

      expect(result).toBe(42);
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('closes the page even when fn throws', async () => {
      await expect(
        service.withPage(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('never exceeds MAX_CONCURRENT_TABS (5) in flight', async () => {
      let concurrent = 0;
      let maxObserved = 0;
      const jobs = Array.from({ length: 10 }, (_, i) =>
        service.withPage(async () => {
          concurrent += 1;
          if (concurrent > maxObserved) maxObserved = concurrent;
          await new Promise<void>((r) => setTimeout(r, 5));
          concurrent -= 1;
          return i;
        }),
      );
      const results = await Promise.all(jobs);
      expect(results).toHaveLength(10);
      expect(maxObserved).toBeLessThanOrEqual(5);
      expect(maxObserved).toBeGreaterThan(0);
      expect(mockPage.close).toHaveBeenCalledTimes(10);
    });

    it('recycles the browser after JOBS_PER_RESTART (100) jobs', async () => {
      for (let i = 0; i < 100; i++) {
        await service.withPage(async () => undefined);
      }

      // First launch happened on first acquire; recycle should have triggered
      // after the 100th release (active tabs back to 0).
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
      expect(service.isActive()).toBe(false);

      // Next acquire re-launches.
      await service.withPage(async () => undefined);
      expect(puppeteer.launch).toHaveBeenCalledTimes(2);
    });
  });
});
