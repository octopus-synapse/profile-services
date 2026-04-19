import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class SmtpHealthIndicator extends HealthIndicator {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const host = this.config.get<string>('SMTP_HOST');
    const sendgrid = this.config.get<string>('SENDGRID_API_KEY');

    if (!host && !sendgrid) {
      return this.getStatus(key, true, {
        message: 'Email delivery disabled (no SMTP_HOST / SENDGRID_API_KEY)',
        configured: false,
      });
    }

    return this.getStatus(key, true, {
      message: host ? 'SMTP configured' : 'SendGrid configured',
      configured: true,
      provider: host ? 'smtp' : 'sendgrid',
    });
  }
}
