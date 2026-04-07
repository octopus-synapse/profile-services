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

import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
export class BrowserManagerService {
  private readonly logger = new Logger(BrowserManagerService.name);
  private browser: Browser | null = null;

  /**
   * Gets existing browser or creates new one
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.logger.log('Launching new browser instance...');
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
      this.logger.log('Closing browser instance...');
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
