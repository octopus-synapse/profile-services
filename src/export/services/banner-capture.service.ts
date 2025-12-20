/**
 * Banner Capture Service - Single Responsibility Pattern
 *
 * Single Responsibility:
 * - Capture screenshots of banners in high quality
 * - Configure viewport and wait for complete rendering
 * - Return PNG buffer of rendered banner
 *
 * Uncle Bob: "Do one thing and do it well"
 */

import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { BrowserManagerService } from './browser-manager.service';
import {
  VIEWPORT,
  TIMEOUT,
  DEBUG_PATH,
  DEFAULT,
} from '../constants/ui.constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BannerCaptureService {
  private readonly logger = new Logger(BannerCaptureService.name);

  constructor(
    private readonly browserManager: BrowserManagerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Captures banner screenshot in high quality
   */
  async capture(
    palette: string = DEFAULT.PALETTE,
    logoUrl: string = '',
  ): Promise<Buffer> {
    const browser = await this.browserManager.getBrowser();
    const page = await browser.newPage();

    try {
      await this.setupPage(page);
      const url = this.buildBannerUrl(palette, logoUrl);
      await this.navigateToPage(page, url);
      await this.waitForBannerReady(page, logoUrl);
      await this.applyQualityStyles(page);
      return await this.captureBannerElement(page);
    } finally {
      await page.close();
    }
  }

  /**
   * Configures viewport in high resolution
   */
  private async setupPage(page: Page): Promise<void> {
    await page.setViewport({
      width: VIEWPORT.BANNER.WIDTH,
      height: VIEWPORT.BANNER.HEIGHT,
      deviceScaleFactor: VIEWPORT.BANNER.SCALE_FACTOR,
    });
  }

  /**
   * Builds banner URL
   */
  private buildBannerUrl(palette: string, logoUrl: string): string {
    const host =
      this.configService.get<string>('FRONTEND_HOST') || DEFAULT.HOST;
    const port =
      this.configService.get<number>('FRONTEND_PORT') || DEFAULT.PORT;

    let url = `http://${host}:${port}/?palette=${encodeURIComponent(palette)}`;
    if (logoUrl) {
      url += `&logo=${encodeURIComponent(logoUrl)}`;
    }
    return url;
  }

  /**
   * Navigates to banner page with error handling
   */
  private async navigateToPage(page: Page, url: string): Promise<void> {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUT.PAGE_LOAD,
      });
    } catch (err) {
      await page.screenshot({ path: DEBUG_PATH.BANNER_GOTO_ERROR });
      this.logger.error('[BannerCapture] Error during page.goto:', err);
      throw err;
    }

    // DEBUG: Screenshot and log after navigation
    await page.screenshot({ path: DEBUG_PATH.BANNER_AFTER_GOTO });
    await page.content(); // Ensure page content is ready
    this.logger.debug('[BannerCapture] HTML after goto');
  }

  /**
   * Waits for complete banner rendering
   */
  private async waitForBannerReady(page: Page, logoUrl: string): Promise<void> {
    // Wait for #banner element
    try {
      await page.waitForSelector('#banner', { timeout: TIMEOUT.SELECTOR_WAIT });
    } catch (err) {
      await this.debugBannerError(page);
      throw err;
    }

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Wait for logo if exists
    if (logoUrl) {
      await this.waitForLogo(page);
    }

    // Wait for code block to render
    await this.waitForCodeBlock(page);
  }

  /**
   * Debug when #banner is not found
   */
  private async debugBannerError(page: Page): Promise<void> {
    await page.screenshot({ path: DEBUG_PATH.BANNER_WAIT_ERROR });
    const html = await page.content();

    const bannerMatch = html.match(
      /<section[^>]*id=["']banner["'][^>]*>([\s\S]*?)<\/section>/i,
    );
    if (bannerMatch) {
      this.logger.error('[BannerCapture] #banner HTML snippet found');
    } else {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      this.logger.error(
        '[BannerCapture] <body> HTML snippet:',
        bodyMatch ? bodyMatch[1].slice(0, 1000) : html.slice(0, 1000),
      );
    }
  }

  /**
   * Waits for logo to load completely
   */
  private async waitForLogo(page: Page): Promise<void> {
    await page.waitForSelector('#company-logo', { timeout: TIMEOUT.LOGO_LOAD });
    await page.waitForFunction(
      () => {
        const img = document.getElementById(
          'company-logo',
        ) as HTMLImageElement | null;
        return img ? img.complete && img.naturalWidth > 0 : true;
      },
      { timeout: TIMEOUT.LOGO_LOAD },
    );
  }

  /**
   * Waits for code block to render
   */
  private async waitForCodeBlock(page: Page): Promise<void> {
    // DEBUG: Screenshot and log before
    await page.screenshot({ path: DEBUG_PATH.BANNER_BEFORE_CODE });

    // Wait for content to render
    await page.waitForFunction(
      () => {
        const code = document.getElementById('code');
        return code && code.innerHTML.trim().length > 0;
      },
      { timeout: TIMEOUT.CODE_BLOCK_RENDER },
    );

    // DEBUG: Screenshot and log after
    await page.screenshot({ path: DEBUG_PATH.BANNER_AFTER_CODE });
  }

  /**
   * Applies quality styles (antialiasing)
   */
  private async applyQualityStyles(page: Page): Promise<void> {
    await page.addStyleTag({
      content: `
        #banner, #banner * {
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
          image-rendering: -webkit-optimize-contrast !important;
          image-rendering: crisp-edges !important;
          image-rendering: pixelated !important;
        }
      `,
    });
  }

  /**
   * Captures screenshot of #banner element
   */
  private async captureBannerElement(page: Page): Promise<Buffer> {
    const banner = await page.$('#banner');
    if (!banner) {
      this.logger.error('[BannerCapture] #banner not found!');
      throw new Error('Banner element not found');
    }

    return (await banner.screenshot({
      encoding: 'binary',
      type: 'png',
      captureBeyondViewport: true,
      omitBackground: false,
    })) as Buffer;
  }
}
