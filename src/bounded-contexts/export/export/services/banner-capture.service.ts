/**
 * Banner Capture Service
 * Captures screenshots of banners in high quality
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'puppeteer';
import { DEFAULT } from '../constants/ui.constants';
import { BannerPageSetup, BannerReadyWaiter } from '../helpers';
import { BrowserManagerService } from './browser-manager.service';

@Injectable()
export class BannerCaptureService {
  private readonly logger = new Logger(BannerCaptureService.name);
  private readonly pageSetup: BannerPageSetup;
  private readonly readyWaiter: BannerReadyWaiter;

  constructor(
    private readonly browserManager: BrowserManagerService,
    private readonly configService: ConfigService,
  ) {
    this.pageSetup = new BannerPageSetup(configService);
    this.readyWaiter = new BannerReadyWaiter();
  }

  async capture(palette: string = DEFAULT.PALETTE, logoUrl: string = ''): Promise<Buffer> {
    const browser = await this.browserManager.getBrowser();
    const page = await browser.newPage();

    try {
      await this.pageSetup.setupPage(page);
      const url = this.pageSetup.buildBannerUrl(palette, logoUrl);
      await this.pageSetup.navigateToPage(page, url);
      await this.readyWaiter.waitForBannerReady(page, logoUrl);
      await this.pageSetup.applyQualityStyles(page);
      return await this.captureBannerElement(page);
    } finally {
      await page.close();
    }
  }

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
