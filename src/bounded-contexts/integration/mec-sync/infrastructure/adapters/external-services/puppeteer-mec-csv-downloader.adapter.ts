/**
 * Puppeteer-based implementation of `MecCsvDownloaderPort`. Uses
 * `puppeteer-extra` with the stealth plugin to navigate the MEC site,
 * absorb a Cloudflare challenge if one is presented, then fetch the
 * raw CSV bytes.
 *
 * Failures are translated into the BC's domain exceptions so the
 * application layer never sees a `Response` object or puppeteer
 * types.
 */

import type { Browser, Page } from 'puppeteer';
import { API_LIMITS, CRYPTO_CONSTANTS, LoggerPort } from '@/shared-kernel';
import { MecCsvBlockedException, MecCsvNoResponseException } from '../../../../domain/exceptions';
import { PUPPETEER_ARGS, PUPPETEER_CONFIG } from '../../../constants';
import { MecCsvDownloaderPort } from '../../../domain/ports/mec-csv-downloader.port';
import { CloudflareBypassAdapter } from './cloudflare-bypass.adapter';

type PuppeteerExtra = {
  use: (plugin: unknown) => void;
  launch: (options: Record<string, unknown>) => Promise<Browser>;
};

export class PuppeteerMecCsvDownloaderAdapter extends MecCsvDownloaderPort {
  private readonly context = 'PuppeteerMecCsvDownloader';

  // Lazily-loaded puppeteer-extra (with the stealth plugin registered).
  // Constructing `StealthPlugin()` at module import time crashes the whole
  // app boot under the bundled runtime (`utils2.forOwn is not a function`),
  // and this adapter is only exercised by the MEC sync cron — never on the
  // request path. So we defer the require + plugin registration to the first
  // browser launch instead of doing it at module scope.
  private puppeteer: PuppeteerExtra | null = null;

  constructor(
    private readonly logger: LoggerPort,
    private readonly cloudflare: CloudflareBypassAdapter,
  ) {
    super();
  }

  async download(url: string): Promise<Buffer> {
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
    return this.getPuppeteer().launch({ headless: true, args: [...PUPPETEER_ARGS] });
  }

  /**
   * Resolve the puppeteer-extra singleton, registering the stealth plugin on
   * first use. Memoised on the instance so the plugin is registered once.
   */
  private getPuppeteer(): PuppeteerExtra {
    if (!this.puppeteer) {
      const puppeteerExtra = require('puppeteer-extra') as PuppeteerExtra;
      const StealthPlugin = require('puppeteer-extra-plugin-stealth') as () => unknown;
      puppeteerExtra.use(StealthPlugin());
      this.puppeteer = puppeteerExtra;
    }
    return this.puppeteer;
  }

  private async createPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR, pt;q=0.9, en-US;q=0.8, en;q=0.7',
      Accept:
        'text/html, application/xhtml+xml, application/xml;q=0.9, image/avif, image/webp, image/apng, */*;q=0.8',
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
    await this.cloudflare.waitForChallengeIfNeeded(page);
  }

  private async downloadFile(page: Page, url: string): Promise<Buffer> {
    this.logger.log(`Requesting CSV file: ${url}`, this.context);

    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: PUPPETEER_CONFIG.DOWNLOAD_TIMEOUT,
    });

    if (!response) {
      throw new MecCsvNoResponseException();
    }

    await this.cloudflare.waitForChallengeIfNeeded(page);

    const buffer = Buffer.from(await response.buffer());
    this.validateCsvContent(buffer);

    this.logger.log(`Downloaded ${this.formatFileSize(buffer.length)}`, this.context);

    return buffer;
  }

  private validateCsvContent(buffer: Buffer): void {
    const start = buffer.slice(0, API_LIMITS.MAX_PREVIEW_CHARS).toString('utf-8').toLowerCase();
    const isHtml = start.includes('<!doctype') || start.includes('<html');

    if (isHtml) {
      throw new MecCsvBlockedException();
    }
  }

  private formatFileSize(bytes: number): string {
    return `${(bytes / CRYPTO_CONSTANTS.BYTES_PER_MB).toFixed(2)} MB`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
