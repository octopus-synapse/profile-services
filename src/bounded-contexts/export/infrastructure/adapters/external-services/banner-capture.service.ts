/**
 * Banner Capture Service
 * Captures screenshots of banners in high quality
 */

import { Injectable } from '@nestjs/common';
import { ConfigPort } from '@/shared-kernel/config';
import { Page } from 'puppeteer';
import { BannerElementNotFoundException } from '@/bounded-contexts/export/domain/exceptions/export.exceptions';
import { LoggerPort } from '@/shared-kernel';
import { DEFAULT } from '../../constants/ui.constants';
import { BannerPageSetup, BannerReadyWaiter } from '../helpers';
import { BrowserManagerService } from './browser-manager.service';

const CTX = 'BannerCaptureService';

@Injectable()
export class BannerCaptureService {
  private readonly pageSetup: BannerPageSetup;
  private readonly readyWaiter: BannerReadyWaiter;

  constructor(
    private readonly browserManager: BrowserManagerService,
    private readonly configService: ConfigPort,
    private readonly logger: LoggerPort,
  ) {
    this.pageSetup = new BannerPageSetup(configService, logger);
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
      this.logger.error('#banner element not found', undefined, CTX);
      throw new BannerElementNotFoundException();
    }

    return (await banner.screenshot({
      encoding: 'binary',
      type: 'png',
      captureBeyondViewport: true,
      omitBackground: false,
    })) as Buffer;
  }
}
