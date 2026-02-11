/**
 * Banner Page Setup Helper
 * Handles page configuration and navigation for banner capture
 */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'puppeteer';
import { DEBUG_PATH, DEFAULT, TIMEOUT, VIEWPORT } from '../constants/ui.constants';

export class BannerPageSetup {
  private readonly logger = new Logger(BannerPageSetup.name);

  constructor(private readonly configService: ConfigService) {}

  async setupPage(page: Page): Promise<void> {
    await page.setViewport({
      width: VIEWPORT.BANNER.WIDTH,
      height: VIEWPORT.BANNER.HEIGHT,
      deviceScaleFactor: VIEWPORT.BANNER.SCALE_FACTOR,
    });
  }

  buildBannerUrl(palette: string, logoUrl: string): string {
    const host = this.configService.get<string>('FRONTEND_HOST') ?? DEFAULT.HOST;
    const port = this.configService.get<number>('FRONTEND_PORT') ?? DEFAULT.PORT;

    let url = `http://${host}:${port}/?palette=${encodeURIComponent(palette)}`;
    if (logoUrl) {
      url += `&logo=${encodeURIComponent(logoUrl)}`;
    }
    return url;
  }

  async navigateToPage(page: Page, url: string): Promise<void> {
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

    await page.screenshot({ path: DEBUG_PATH.BANNER_AFTER_GOTO });
    await page.content();
    this.logger.debug('[BannerCapture] HTML after goto');
  }

  async applyQualityStyles(page: Page): Promise<void> {
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
}
