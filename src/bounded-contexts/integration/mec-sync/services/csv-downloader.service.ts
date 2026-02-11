/**
 * CSV Downloader Service
 * Single Responsibility: Download CSV file using Puppeteer with Cloudflare bypass
 */

import { Injectable } from '@nestjs/common';
import type { Browser, Page } from 'puppeteer';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { API_LIMITS, CRYPTO_CONSTANTS } from '@/shared-kernel';
import { MEC_CSV_URL, PUPPETEER_ARGS, PUPPETEER_CONFIG } from '../constants';
import { CloudflareHandlerService } from './cloudflare-handler.service';

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
const puppeteerExtra: {
  use: (plugin: unknown) => void;
  launch: (options: Record<string, unknown>) => Promise<Browser>;
} = require('puppeteer-extra');
const StealthPlugin: () => unknown = require('puppeteer-extra-plugin-stealth');
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */

puppeteerExtra.use(StealthPlugin());

@Injectable()
export class CsvDownloaderService {
  private readonly context = 'CsvDownloader';

  constructor(
    private readonly logger: AppLoggerService,
    private readonly cloudflareHandler: CloudflareHandlerService,
  ) {}

  /**
   * Download CSV file from MEC using Puppeteer
   */
  async download(url: string = MEC_CSV_URL): Promise<Buffer> {
    this.logger.log('Launching Puppeteer with stealth mode...', this.context);

    const browser = await this.launchBrowser();

    try {
      const page = await this.createPage(browser);
      await this.navigateToMainSite(page);
      return await this.downloadFile(page, url);
    } finally {
      await browser.close();
    }
  }

  private async launchBrowser(): Promise<Browser> {
    return puppeteerExtra.launch({
      headless: true,
      args: [...PUPPETEER_ARGS],
    });
  }

  private async createPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });

    await page.setViewport({ width: 1920, height: 1080 });

    return page;
  }

  private async navigateToMainSite(page: Page): Promise<void> {
    const mainSiteUrl = 'https://dadosabertos.mec.gov.br';

    this.logger.log(`Navigating to main site: ${mainSiteUrl}`, this.context);

    await page.goto(mainSiteUrl, {
      waitUntil: 'networkidle2',
      timeout: PUPPETEER_CONFIG.NAVIGATION_TIMEOUT,
    });

    await this.delay(PUPPETEER_CONFIG.HUMAN_DELAY);
    await this.cloudflareHandler.waitForChallengeIfNeeded(page);
  }

  private async downloadFile(page: Page, url: string): Promise<Buffer> {
    this.logger.log(`Requesting CSV file: ${url}`, this.context);

    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: PUPPETEER_CONFIG.DOWNLOAD_TIMEOUT,
    });

    if (!response) {
      throw new Error('No response received');
    }

    await this.cloudflareHandler.waitForChallengeIfNeeded(page);

    const buffer = Buffer.from(await response.buffer());
    this.validateCsvContent(buffer);

    this.logger.log(`Downloaded ${this.formatFileSize(buffer.length)}`, this.context);

    return buffer;
  }

  private validateCsvContent(buffer: Buffer): void {
    const start = buffer.slice(0, API_LIMITS.MAX_PREVIEW_CHARS).toString('utf-8').toLowerCase();
    const isHtml = start.includes('<!doctype') || start.includes('<html');

    if (isHtml) {
      throw new Error('Received HTML instead of CSV - Cloudflare may still be blocking');
    }
  }

  private formatFileSize(bytes: number): string {
    return `${(bytes / CRYPTO_CONSTANTS.BYTES_PER_MB).toFixed(2)} MB`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
