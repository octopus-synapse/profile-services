import type { PrismaClient } from '@prisma/client';
import type { DistributedLockPort, EventBusPort, LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import type { EnvConfig } from '@/shared-kernel/config/config.schema';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';
import type { BillingHttpBundle } from './application/ports/billing-http.bundle';
import type { BillingRuntimeConfig } from './application/ports/billing-runtime.port';
import { ManageBillingAccessUseCase } from './application/use-cases/access/manage-billing-access.use-case';
import { ManageCheckoutUseCase } from './application/use-cases/checkout/manage-checkout.use-case';
import { PublishBillingOutboxUseCase } from './application/use-cases/outbox/publish-billing-outbox.use-case';
import { ProcessProviderEventUseCase } from './application/use-cases/provider/process-provider-event.use-case';
import { ReconcileBillingUseCase } from './application/use-cases/provider/reconcile-billing.use-case';
import { GetBillingStatusUseCase } from './application/use-cases/status/get-billing-status.use-case';
import { ManageSubscriptionUseCase } from './application/use-cases/subscription/manage-subscription.use-case';
import { MercadoPagoPaymentAdapter } from './infrastructure/adapters/external-services/mercado-pago-payment.adapter';
import { PrismaBillingStore } from './infrastructure/adapters/persistence/prisma-billing-store.repository';
import { PrismaBillingUnitOfWork } from './infrastructure/adapters/persistence/prisma-billing-unit-of-work.adapter';
import {
  SystemBillingClock,
  SystemBillingIds,
} from './infrastructure/adapters/security/system-billing-runtime.adapter';
import { billingRoutes } from './infrastructure/controllers/billing.routes';
import {
  BILLING_OUTBOX_QUEUE,
  BILLING_RECONCILIATION_QUEUE,
  BillingOutboxWorker,
  BillingReconciliationWorker,
} from './infrastructure/workers/billing-maintenance.worker';

export interface BillingComposition extends BoundedContextComposition<BillingHttpBundle> {
  readonly access: ManageBillingAccessUseCase;
  readonly preparationMeter: ManageBillingAccessUseCase;
  readonly freeTranslationMeter: ManageBillingAccessUseCase;
}

export function buildBillingComposition(deps: {
  prisma: PrismaClient;
  config: EnvConfig;
  logger: LoggerPort;
  events: EventBusPort;
  queue: JobQueuePort;
  lock: DistributedLockPort;
}): BillingComposition {
  const { prisma, config, logger, events, queue, lock } = deps;
  const store = new PrismaBillingStore(prisma);
  const unit = new PrismaBillingUnitOfWork(prisma, logger);
  const clock = new SystemBillingClock();
  const ids = new SystemBillingIds();
  const runtime: BillingRuntimeConfig = {
    enabled: config.BILLING_ENABLED === true,
    cardEnabled: config.BILLING_CARD_ENABLED !== false,
    pixEnabled: config.BILLING_PIX_ENABLED !== false,
    ordersPublicKey: config.MERCADO_PAGO_ORDERS_PUBLIC_KEY ?? null,
    subscriptionsPublicKey: config.MERCADO_PAGO_SUBSCRIPTIONS_PUBLIC_KEY ?? null,
    frontendUrl: config.FRONTEND_URL ?? 'http://localhost:8081',
    paymentReturnUrl:
      config.MERCADO_PAGO_RETURN_URL ?? config.FRONTEND_URL ?? 'http://localhost:8081',
    testBuyerEmail:
      config.NODE_ENV === 'production' ? null : (config.MERCADO_PAGO_TEST_BUYER_EMAIL ?? null),
    testPixFirstName:
      config.NODE_ENV === 'development' &&
      config.MERCADO_PAGO_TEST_BUYER_EMAIL &&
      config.MERCADO_PAGO_TEST_PIX_FIRST_NAME === 'APRO'
        ? 'APRO'
        : null,
    aiCostBrlPerUsd: Number(config.AI_COST_BRL_PER_USD),
  };
  const provider =
    config.MERCADO_PAGO_ORDERS_ACCESS_TOKEN &&
    config.MERCADO_PAGO_ORDERS_WEBHOOK_SECRET &&
    config.MERCADO_PAGO_SUBSCRIPTIONS_ACCESS_TOKEN &&
    config.MERCADO_PAGO_SUBSCRIPTIONS_WEBHOOK_SECRET
      ? new MercadoPagoPaymentAdapter(
          {
            ordersAccessToken: config.MERCADO_PAGO_ORDERS_ACCESS_TOKEN,
            subscriptionsAccessToken: config.MERCADO_PAGO_SUBSCRIPTIONS_ACCESS_TOKEN,
            webhookSecrets: [
              config.MERCADO_PAGO_ORDERS_WEBHOOK_SECRET,
              config.MERCADO_PAGO_SUBSCRIPTIONS_WEBHOOK_SECRET,
            ],
          },
          logger,
        )
      : null;
  const processor = provider
    ? new ProcessProviderEventUseCase(store, unit, provider, ids, clock, logger)
    : null;
  const access = new ManageBillingAccessUseCase(store, runtime, clock, logger);
  const status = new GetBillingStatusUseCase(store, access, runtime, clock, logger);
  const checkout = new ManageCheckoutUseCase(
    store,
    unit,
    provider,
    processor,
    lock,
    ids,
    clock,
    runtime,
    logger,
  );
  const subscription = new ManageSubscriptionUseCase(store, provider, ids, clock, runtime, logger);
  const useCases: BillingHttpBundle = {
    access,
    status,
    checkout,
    subscription,
    provider,
    processProvider: processor,
    enabled: runtime.enabled,
  };
  const outboxWorker = new BillingOutboxWorker(
    new PublishBillingOutboxUseCase(store, events, logger),
    lock,
    logger,
  );
  const reconciliationWorker = new BillingReconciliationWorker(
    new ReconcileBillingUseCase(store, provider, processor, logger),
    lock,
    logger,
  );
  return {
    useCases,
    routes: billingRoutes,
    access,
    preparationMeter: access,
    freeTranslationMeter: access,
    workers: [
      { queue: BILLING_OUTBOX_QUEUE, process: outboxWorker.process.bind(outboxWorker) },
      {
        queue: BILLING_RECONCILIATION_QUEUE,
        process: reconciliationWorker.process.bind(reconciliationWorker),
      },
    ],
    lifecycles: [
      {
        init: async () => {
          await queue.schedule(
            BILLING_OUTBOX_QUEUE,
            { kind: 'publish' },
            {
              repeat: { pattern: '* * * * *', tz: 'America/Sao_Paulo' },
              jobId: 'billing-outbox-schedule',
            },
          );
          await queue.schedule(
            BILLING_RECONCILIATION_QUEUE,
            { kind: 'reconcile' },
            {
              repeat: { pattern: '17 * * * *', tz: 'America/Sao_Paulo' },
              jobId: 'billing-reconciliation-schedule',
            },
          );
        },
      },
    ],
  };
}
