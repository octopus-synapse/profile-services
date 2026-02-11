import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { WebhookService } from './webhook.service';

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
