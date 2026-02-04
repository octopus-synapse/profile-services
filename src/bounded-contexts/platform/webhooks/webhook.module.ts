import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';

/**
 * Webhook Module
 *
 * Provides webhook notification system for external integrations.
 * Event handlers automatically trigger HTTP POST to configured URLs.
 */
@Module({
  imports: [PrismaModule],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
