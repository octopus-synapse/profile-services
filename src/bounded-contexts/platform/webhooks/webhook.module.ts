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
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { EventBusPort, LoggerPort } from '@/shared-kernel';
import { WebhooksUseCases } from './application/ports/webhooks.port';
import { registerWebhooksHandlers } from './infrastructure/handlers/register-handlers';
import { buildWebhooksUseCases } from './webhooks.composition';
import { webhooksRoutes } from './webhooks.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(WebhooksUseCases, webhooksRoutes),
  providers: [
    {
      provide: WebhooksUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildWebhooksUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: 'WEBHOOKS_HANDLERS_REGISTERED',
      useFactory: (
        eventBus: EventBusPort,
        bc: WebhooksUseCases,
        logger: LoggerPort,
      ): boolean => {
        registerWebhooksHandlers({ eventBus, bc, logger });
        return true;
      },
      inject: [EventBusPort, WebhooksUseCases, LoggerPort],
    },
  ],
  exports: [WebhooksUseCases],
})
export class WebhookModule {}
