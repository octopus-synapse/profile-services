/**
 * Cloudflare bypass helper used by the puppeteer downloader. Detects
 * the "Just a moment" interstitial and waits for the challenge to
 * resolve before letting the caller proceed with the real navigation.
 */

import type { Page } from 'puppeteer';
import { LoggerPort, TIME_MS } from '@/shared-kernel';
import { PUPPETEER_CONFIG } from '../../../constants';

export class CloudflareBypassAdapter {
  private readonly context = 'CloudflareBypass';

  constructor(private readonly logger: LoggerPort) {}

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
