/**
 * Banner Page Setup Helper
 * Handles page configuration and navigation for banner capture
 */

import { Page } from 'puppeteer';
import type { LoggerPort } from '@/shared-kernel';
import { ConfigPort } from '@/shared-kernel/config';
import { DEBUG_PATH, DEFAULT, TIMEOUT, VIEWPORT } from '../../constants/ui.constants';

const CTX = 'BannerPageSetup';

export class BannerPageSetup {
  constructor(
    private readonly configService: ConfigPort,
    private readonly logger: LoggerPort,
  ) {}

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
    // Validate constructed URL to prevent SSRF
    new URL(url);
    return url;
  }

  async navigateToPage(page: Page, url: string): Promise<void> {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT.PAGE_LOAD });
    } catch (err) {
      await page.screenshot({ path: DEBUG_PATH.BANNER_GOTO_ERROR });
      this.logger.error(
        `Error during page.goto: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
        CTX,
      );
      throw err;
    }

    await page.screenshot({ path: DEBUG_PATH.BANNER_AFTER_GOTO });
    await page.content();
    this.logger.debug('HTML after goto', CTX);
  }

  async applyQualityStyles(page: Page): Promise<void> {
    await page.addStyleTag({
      content: `
        #banner, #banner * { -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
          image-rendering: -webkit-optimize-contrast !important;
          image-rendering: crisp-edges !important;
          image-rendering: pixelated !important; }
      `,
    });
  }
}
