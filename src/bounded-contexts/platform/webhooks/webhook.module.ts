import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookConfigService } from './webhook-config.service';

/**
 * Webhook Module
 *
 * Provides webhook notification system for external integrations.
 * Event handlers automatically trigger HTTP POST to configured URLs.
 */
@Module({
  imports: [PrismaModule],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookConfigService],
  exports: [WebhookService],
})
export class WebhookModule {}
