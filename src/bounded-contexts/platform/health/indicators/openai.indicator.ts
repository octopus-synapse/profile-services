import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class OpenAIHealthIndicator extends HealthIndicator {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    const model = this.config.get<string>('OPENAI_MODEL');
    const configured = Boolean(apiKey);

    return this.getStatus(key, true, {
      message: configured ? 'OpenAI configured' : 'OpenAI disabled (no OPENAI_API_KEY)',
      configured,
      model,
    });
  }
}
