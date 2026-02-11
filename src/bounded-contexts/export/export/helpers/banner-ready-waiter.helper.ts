/**
 * Banner Ready Waiter Helper
 * Waits for banner elements to render completely
 */

import { Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { API_LIMITS } from '@/shared-kernel';
import { DEBUG_PATH, TIMEOUT } from '../constants/ui.constants';

export class BannerReadyWaiter {
  private readonly logger = new Logger(BannerReadyWaiter.name);

  async waitForBannerReady(page: Page, logoUrl: string): Promise<void> {
    await this.waitForBannerElement(page);
    await page.evaluateHandle('document.fonts.ready');

    if (logoUrl) {
      await this.waitForLogo(page);
    }

    await this.waitForCodeBlock(page);
  }

  private async waitForBannerElement(page: Page): Promise<void> {
    try {
      await page.waitForSelector('#banner', { timeout: TIMEOUT.SELECTOR_WAIT });
    } catch (err) {
      await this.debugBannerError(page);
      throw err;
    }
  }

  private async debugBannerError(page: Page): Promise<void> {
    await page.screenshot({ path: DEBUG_PATH.BANNER_WAIT_ERROR });
    const html = await page.content();

    const bannerMatch = html.match(/<section[^>]*id=["']banner["'][^>]*>([\s\S]*?)<\/section>/i);
    if (bannerMatch) {
      this.logger.error('[BannerCapture] #banner HTML snippet found');
    } else {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      this.logger.error(
        '[BannerCapture] <body> HTML snippet:',
        bodyMatch
          ? bodyMatch[1].slice(0, API_LIMITS.MAX_DEBUG_CHARS)
          : html.slice(0, API_LIMITS.MAX_DEBUG_CHARS),
      );
    }
  }

  private async waitForLogo(page: Page): Promise<void> {
    await page.waitForSelector('#company-logo', { timeout: TIMEOUT.LOGO_LOAD });
    await page.waitForFunction(
      () => {
        const img = document.getElementById('company-logo') as HTMLImageElement | null;
        return img ? img.complete && img.naturalWidth > 0 : true;
      },
      { timeout: TIMEOUT.LOGO_LOAD },
    );
  }

  private async waitForCodeBlock(page: Page): Promise<void> {
    await page.screenshot({ path: DEBUG_PATH.BANNER_BEFORE_CODE });

    await page.waitForFunction(
      () => {
        const code = document.getElementById('code');
        return code && code.innerHTML.trim().length > 0;
      },
      { timeout: TIMEOUT.CODE_BLOCK_RENDER },
    );

    await page.screenshot({ path: DEBUG_PATH.BANNER_AFTER_CODE });
  }
}
