import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { TranslationService } from '@/bounded-contexts/translation/translation/translation.service';

@Injectable()
export class TranslateHealthIndicator extends HealthIndicator {
  constructor(private readonly translationService: TranslationService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const isAvailable = await this.translationService.checkServiceHealth();

      if (isAvailable) {
        return this.getStatus(key, true, {
          message: 'LibreTranslate is available',
          configured: true,
        });
      }

      return this.getStatus(key, true, {
        message: 'LibreTranslate not available (graceful degradation)',
        configured: false,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Translation service check failed',
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
