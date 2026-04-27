/**
 * Webhook Module
 *
 * Thin Nest shell over `buildWebhooksUseCases`. All wiring lives in
 * `webhooks.composition.ts`. The `WebhookEventHandler` (Nest-decorated
 * `@OnEvent` listener) stays in the module providers and depends on
 * the bundle.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { WebhooksUseCases } from './application/ports/webhooks.port';
import { WebhookController } from './infrastructure/controllers/webhook.controller';
import { WebhookEventHandler } from './infrastructure/handlers/webhook-event.handler';
import { buildWebhooksUseCases } from './webhooks.composition';

@Module({
  imports: [PrismaModule],
  controllers: [WebhookController],
  providers: [
    {
      provide: WebhooksUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildWebhooksUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    WebhookEventHandler,
  ],
  exports: [WebhooksUseCases],
})
export class WebhookModule {}
