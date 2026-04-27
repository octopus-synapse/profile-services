/**
 * Webhook Module
 *
 * ADR-001: five POJO use cases drive the controller and one
 * fan-out use case drives the event handler. Persistence goes
 * through `WebhookConfigRepositoryPort` (Prisma adapter); HTTP
 * delivery goes through `WebhookDeliveryPort` (fetch + HMAC).
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { CreateWebhookUseCase } from './application/use-cases/create-webhook/create-webhook.use-case';
import { DeleteWebhookUseCase } from './application/use-cases/delete-webhook/delete-webhook.use-case';
import { DeliverEventWebhooksUseCase } from './application/use-cases/deliver-event-webhooks/deliver-event-webhooks.use-case';
import { ListWebhookDeliveriesUseCase } from './application/use-cases/list-webhook-deliveries/list-webhook-deliveries.use-case';
import { ListWebhooksUseCase } from './application/use-cases/list-webhooks/list-webhooks.use-case';
import { UpdateWebhookUseCase } from './application/use-cases/update-webhook/update-webhook.use-case';
import { WebhookConfigRepositoryPort } from './domain/ports/webhook-config.repository.port';
import { WebhookDeliveryPort } from './domain/ports/webhook-delivery.port';
import { HttpWebhookDeliveryAdapter } from './infrastructure/adapters/external-services/http-webhook-delivery.adapter';
import { PrismaWebhookConfigRepository } from './infrastructure/adapters/persistence/prisma-webhook-config.repository';
import { WebhookController } from './infrastructure/controllers/webhook.controller';
import { WebhookEventHandler } from './infrastructure/handlers/webhook-event.handler';

@Module({
  imports: [PrismaModule],
  controllers: [WebhookController],
  providers: [
    {
      provide: WebhookConfigRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaWebhookConfigRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: WebhookDeliveryPort,
      useFactory: (logger: LoggerPort) => new HttpWebhookDeliveryAdapter(logger),
      inject: [LoggerPort],
    },
    {
      provide: ListWebhooksUseCase,
      useFactory: (repo: WebhookConfigRepositoryPort) => new ListWebhooksUseCase(repo),
      inject: [WebhookConfigRepositoryPort],
    },
    {
      provide: CreateWebhookUseCase,
      useFactory: (repo: WebhookConfigRepositoryPort) => new CreateWebhookUseCase(repo),
      inject: [WebhookConfigRepositoryPort],
    },
    {
      provide: UpdateWebhookUseCase,
      useFactory: (repo: WebhookConfigRepositoryPort) => new UpdateWebhookUseCase(repo),
      inject: [WebhookConfigRepositoryPort],
    },
    {
      provide: DeleteWebhookUseCase,
      useFactory: (repo: WebhookConfigRepositoryPort) => new DeleteWebhookUseCase(repo),
      inject: [WebhookConfigRepositoryPort],
    },
    {
      provide: ListWebhookDeliveriesUseCase,
      useFactory: (repo: WebhookConfigRepositoryPort) => new ListWebhookDeliveriesUseCase(repo),
      inject: [WebhookConfigRepositoryPort],
    },
    {
      provide: DeliverEventWebhooksUseCase,
      useFactory: (
        repo: WebhookConfigRepositoryPort,
        delivery: WebhookDeliveryPort,
        logger: LoggerPort,
      ) => new DeliverEventWebhooksUseCase(repo, delivery, logger),
      inject: [WebhookConfigRepositoryPort, WebhookDeliveryPort, LoggerPort],
    },
    WebhookEventHandler,
  ],
})
export class WebhookModule {}
