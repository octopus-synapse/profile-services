/**
 * PDF Generator Service
 * Core PDF generation logic
 */

import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { BrowserManagerService } from './browser-manager.service';
import { PdfTemplateService } from './pdf-template.service';
import { ResumePDFOptions } from '../helpers';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  constructor(
    private readonly browserManager: BrowserManagerService,
    private readonly templateService: PdfTemplateService,
  ) {}

  /**
   * Generate PDF from resume
   */
  async generate(options: ResumePDFOptions = {}): Promise<Buffer> {
    const browser = await this.browserManager.getBrowser();
    const page = await browser.newPage();

    try {
      const pageSetup = this.templateService.getPageSetup();
      const styleExtractor = this.templateService.getStyleExtractor();

      await pageSetup.setupPage(page);
      const url = pageSetup.buildResumeUrl(options);
      await pageSetup.navigateToPage(page, url);
      await pageSetup.waitForResumeReady(page);

      const styles = await styleExtractor.extractStyles(page);
      await styleExtractor.renderCleanPage(page, url, styles);

      return await this.generatePDF(page);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate PDF buffer from page
   */
  private async generatePDF(page: Page): Promise<Buffer> {
    const contentHeightMm = await this.calculateContentHeight(page);
    const pdfConfig = this.templateService.getPdfConfig();

    return Buffer.from(
      await page.pdf({
        ...pdfConfig,
        height: `${contentHeightMm}mm`,
      }),
    );
  }

  /**
   * Calculate content height in millimeters
   */
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
