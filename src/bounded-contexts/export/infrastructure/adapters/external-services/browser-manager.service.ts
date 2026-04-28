/**
 * Browser Manager - Single Responsibility Pattern
 *
 * Single Responsibility:
 * - Manage Puppeteer browser lifecycle (singleton)
 * - Reuse instance between multiple captures
 * - Provide clean interface to get/close browser
 *
 * Uncle Bob: "A class should have only one reason to change"
 */

import { Injectable } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import { LoggerPort } from '@/shared-kernel';

@Injectable()
export class BrowserManagerService {
  private browser: Browser | null = null;

  constructor(private readonly logger: LoggerPort) {}

  /**
   * Gets existing browser or creates new one
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
   * Closes browser and clears reference
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      this.logger.log('Closing browser instance...', 'BrowserManagerService');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Checks if browser is active
   */
  isActive(): boolean {
    return this.browser !== null;
  }
}
