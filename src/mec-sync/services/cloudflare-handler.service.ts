/**
 * Cloudflare Handler Service
 * Handles Cloudflare challenge detection and bypass
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TIME_MS } from '../../common/constants/app.constants';
import { PUPPETEER_CONFIG } from '../constants';
import type { Page } from 'puppeteer';

@Injectable()
export class CloudflareHandlerService {
  private readonly context = 'CloudflareHandler';

  constructor(private readonly logger: AppLoggerService) {}

  async waitForChallengeIfNeeded(page: Page): Promise<void> {
    const content = await page.content();

    if (!this.isCloudflareChallenge(content)) {
      return;
    }

    this.logger.log('Cloudflare challenge detected, waiting...', this.context);

    await page.waitForFunction(
      () => {
        const body = document.body.innerHTML || '';
        return (
          !body.includes('Just a moment') &&
          !body.includes('Checking your browser') &&
          !body.includes('Verifying') &&
          !body.includes('cf-spinner')
        );
      },
      { timeout: PUPPETEER_CONFIG.CHALLENGE_TIMEOUT },
    );

    this.logger.log('Cloudflare challenge passed!', this.context);
    await this.delay(TIME_MS.SECOND);
  }

  isCloudflareChallenge(content: string): boolean {
    return (
      content.includes('Just a moment') ||
      content.includes('Checking your browser') ||
      content.includes('cf-spinner') ||
      content.includes('Verifying you are human')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
