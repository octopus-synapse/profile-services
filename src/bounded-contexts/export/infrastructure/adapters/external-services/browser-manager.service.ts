/**
 * Browser Manager - Single Responsibility Pattern
 *
 * Single Responsibility:
 * - Manage Puppeteer browser lifecycle (singleton)
 * - Reuse instance between multiple captures
 * - Bound concurrent tabs via semaphore (`MAX_CONCURRENT_TABS`)
 * - Recycle the browser after `JOBS_PER_RESTART` page-lifecycles
 *   to bleed off long-tail memory growth in long-running processes
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import type { LoggerPort } from '@/shared-kernel';

const MAX_CONCURRENT_TABS = 5;
const JOBS_PER_RESTART = 100;

export class BrowserManagerService {
  private browser: Browser | null = null;
  private activeTabs = 0;
  private jobsSinceRestart = 0;
  private readonly waitQueue: Array<() => void> = [];

  constructor(private readonly logger: LoggerPort) {}

  /**
   * Recommended API. Acquires a semaphore slot (waits if `MAX_CONCURRENT_TABS`
   * tabs are already in flight), opens a fresh page, runs `fn`, closes the
   * page on the way out, and releases the slot. When `JOBS_PER_RESTART`
   * page-lifecycles have completed AND no tabs remain in flight, the
   * underlying browser is recycled — the next acquire will re-launch.
   */
  async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    await this.acquireTabSlot();
    let page: Page | null = null;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      return await fn(page);
    } finally {
      if (page) {
        await page.close().catch((err) => {
          this.logger.warn('page.close() failed (ignored)', 'BrowserManagerService', {
            stack: err instanceof Error ? err.stack : String(err),
          });
        });
      }
      await this.releaseTabSlot();
    }
  }

  /**
   * Gets existing browser or creates a new one. Prefer `withPage(fn)` for
   * any callsite that opens a page — it participates in the semaphore and
   * recycle policy. Callers that use `getBrowser()` directly bypass both
   * and may exhaust memory under load.
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.logger.log('Launching new browser instance...', 'BrowserManagerService');
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Closes browser and clears reference. Pending semaphore waiters are
   * preserved — they will trigger a fresh launch on their next acquire.
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      this.logger.log('Closing browser instance...', 'BrowserManagerService');
      await this.browser.close();
      this.browser = null;
      this.jobsSinceRestart = 0;
    }
  }

  /**
   * Checks if browser is active
   */
  isActive(): boolean {
    return this.browser !== null;
  }

  private acquireTabSlot(): Promise<void> {
    if (this.activeTabs < MAX_CONCURRENT_TABS) {
      this.activeTabs += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waitQueue.push(() => {
        this.activeTabs += 1;
        resolve();
      });
    });
  }

  private async releaseTabSlot(): Promise<void> {
    this.activeTabs -= 1;
    this.jobsSinceRestart += 1;

    const shouldRecycle =
      this.jobsSinceRestart >= JOBS_PER_RESTART && this.activeTabs === 0 && this.browser !== null;

    if (shouldRecycle) {
      this.logger.log(
        `Recycling browser after ${this.jobsSinceRestart} jobs`,
        'BrowserManagerService',
      );
      try {
        await this.browser?.close();
      } catch (err) {
        this.logger.warn(
          'browser.close() during recycle failed (ignored)',
          'BrowserManagerService',
          {
            stack: err instanceof Error ? err.stack : String(err),
          },
        );
      }
      this.browser = null;
      this.jobsSinceRestart = 0;
    }

    const next = this.waitQueue.shift();
    if (next) next();
  }
}
