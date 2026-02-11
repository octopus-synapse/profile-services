/**
 * PDF Generator Service
 * Core PDF generation logic
 */

import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { TIMEOUT } from '../constants/ui.constants';
import { ResumePDFOptions } from '../helpers';
import { BrowserManagerService } from './browser-manager.service';
import { PdfTemplateService } from './pdf-template.service';

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
    const timeout = options.timeout ?? TIMEOUT.PAGE_LOAD;

    try {
      return await Promise.race([
        this.generateContent(page, options),
        new Promise<Buffer>((_, reject) =>
          setTimeout(
            () => reject(new Error(`PDF generation timed out after ${timeout}ms`)),
            timeout,
          ),
        ),
      ]);
    } finally {
      await page.close();
    }
  }

  private async generateContent(page: Page, options: ResumePDFOptions): Promise<Buffer> {
    const pageSetup = this.templateService.getPageSetup();
    const styleExtractor = this.templateService.getStyleExtractor();

    await pageSetup.setupPage(page);
    const url = pageSetup.buildResumeUrl(options);
    await pageSetup.navigateToPage(page, url);
    await pageSetup.waitForResumeReady(page);

    const styles = await styleExtractor.extractStyles(page);
    await styleExtractor.renderCleanPage(page, url, styles);

    return await this.generatePDF(page);
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
      const heightPx = el ? Math.ceil(el.scrollHeight) : Math.ceil(document.body.scrollHeight);
      return Math.ceil(heightPx * pxToMm) + 2;
    });
  }
}
