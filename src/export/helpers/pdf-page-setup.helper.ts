/**
 * PDF Page Setup Helper
 * Handles Puppeteer page configuration and navigation
 */

import { Page } from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  VIEWPORT,
  TIMEOUT,
  DEBUG_PATH,
  DEFAULT,
} from '../constants/ui.constants';

export interface ResumePDFOptions {
  palette?: string;
  lang?: string;
  bannerColor?: string;
  userId?: string;
  timeout?: number;
}

export class PdfPageSetup {
  private readonly logger = new Logger(PdfPageSetup.name);

  constructor(private readonly configService: ConfigService) {}

  async setupPage(page: Page): Promise<void> {
    await page.setViewport({
      width: VIEWPORT.RESUME.WIDTH,
      height: VIEWPORT.RESUME.HEIGHT,
      deviceScaleFactor: VIEWPORT.RESUME.SCALE_FACTOR,
    });
  }

  buildResumeUrl(options: ResumePDFOptions): string {
    const {
      palette = DEFAULT.PALETTE,
      lang = DEFAULT.LANGUAGE,
      bannerColor,
      userId,
    } = options;
    const host =
      this.configService.get<string>('FRONTEND_HOST') ?? DEFAULT.HOST;
    const port =
      this.configService.get<number>('FRONTEND_PORT') ?? DEFAULT.PORT;

    let url = `http://${host}:${port}/protected/resume?export=1&palette=${encodeURIComponent(palette)}&lang=${encodeURIComponent(lang)}`;

    if (bannerColor) url += `&bannerColor=${encodeURIComponent(bannerColor)}`;
    if (userId) url += `&user=${encodeURIComponent(userId)}`;

    return url;
  }

  async navigateToPage(page: Page, url: string): Promise<void> {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUT.PAGE_LOAD,
      });
    } catch (err) {
      await page.screenshot({ path: DEBUG_PATH.RESUME_GOTO_ERROR });
      this.logger.error('[ResumePDF] Error during page.goto:', err);
      throw err;
    }
  }

  async waitForResumeReady(page: Page): Promise<void> {
    await page.waitForSelector('#resume', { timeout: TIMEOUT.SELECTOR_WAIT });
    await page.waitForSelector('#resume[data-ready="1"]', {
      timeout: TIMEOUT.SELECTOR_WAIT,
    });
  }
}
