/**
 * Resume PDF Service
 * Generates resume PDFs with perfect layout
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Page } from 'puppeteer';
import { BrowserManagerService } from './browser-manager.service';
import { PdfPageSetup, PdfStyleExtractor, ResumePDFOptions } from '../helpers';
import { PDF } from '../constants/ui.constants';

@Injectable()
export class ResumePDFService {
  private readonly logger = new Logger(ResumePDFService.name);
  private readonly pageSetup: PdfPageSetup;
  private readonly styleExtractor: PdfStyleExtractor;

  constructor(
    private readonly browserManager: BrowserManagerService,
    private readonly configService: ConfigService,
  ) {
    this.pageSetup = new PdfPageSetup(configService);
    this.styleExtractor = new PdfStyleExtractor();
  }

  async generate(options: ResumePDFOptions = {}): Promise<Buffer> {
    const browser = await this.browserManager.getBrowser();
    const page = await browser.newPage();

    try {
      await this.pageSetup.setupPage(page);
      const url = this.pageSetup.buildResumeUrl(options);
      await this.pageSetup.navigateToPage(page, url);
      await this.pageSetup.waitForResumeReady(page);

      const styles = await this.styleExtractor.extractStyles(page);
      await this.styleExtractor.renderCleanPage(page, url, styles);

      return await this.generatePDF(page);
    } finally {
      await page.close();
    }
  }

  private async generatePDF(page: Page): Promise<Buffer> {
    const contentHeightMm = await this.calculateContentHeight(page);

    return Buffer.from(
      await page.pdf({
        printBackground: true,
        width: `${PDF.A3_WIDTH_MM}mm`,
        height: `${contentHeightMm}mm`,
        preferCSSPageSize: false,
        margin: PDF.MARGIN,
      }),
    );
  }

  private async calculateContentHeight(page: Page): Promise<number> {
    return await page.evaluate(() => {
      const pxToMm = 0.264583;
      const el = document.querySelector('#resume');
      const heightPx = el
        ? Math.ceil(el.scrollHeight)
        : Math.ceil(document.body.scrollHeight);
      return Math.ceil(heightPx * pxToMm) + 2;
    });
  }
}
