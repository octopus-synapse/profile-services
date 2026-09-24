import type { EventBusPort, LoggerPort } from '@/shared-kernel';
import { type AuditLogPort, buildAuditEntry } from '@/shared-kernel/audit';
import { registerHandler } from '@/shared-kernel/event-bus/register-handler';
import {
  BillingPurchaseApprovedEvent,
  BillingPurchaseCreatedEvent,
  BillingPurchaseReversedEvent,
} from '../../domain/events/billing.events';

class PurchaseCreatedAuditHandler {
  constructor(
    private readonly audit: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {}
  async handle(event: BillingPurchaseCreatedEvent) {
    this.logger.debug('Auditing billing purchase creation', 'PurchaseCreatedAuditHandler');
    await this.audit.log(
      buildAuditEntry({
        userId: event.payload.userId,
        action: 'BILLING_PURCHASE_CREATED',
        entityType: 'BillingPurchase',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }
}
class PurchaseApprovedAuditHandler {
  constructor(
    private readonly audit: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {}
  async handle(event: BillingPurchaseApprovedEvent) {
    this.logger.debug('Auditing billing purchase approval', 'PurchaseApprovedAuditHandler');
    await this.audit.log(
      buildAuditEntry({
        userId: event.payload.userId,
        action: 'BILLING_PURCHASE_APPROVED',
        entityType: 'BillingPurchase',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }
}
class PurchaseReversedAuditHandler {
  constructor(
    private readonly audit: AuditLogPort,
    private readonly logger: LoggerPort,
  ) {}
  async handle(event: BillingPurchaseReversedEvent) {
    this.logger.debug('Auditing billing purchase reversal', 'PurchaseReversedAuditHandler');
    await this.audit.log(
      buildAuditEntry({
        userId: event.payload.userId,
        action: 'BILLING_PURCHASE_REVERSED',
        entityType: 'BillingPurchase',
        entityId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
      }),
    );
  }
}

export function registerBillingAuditHandlers(
  bus: EventBusPort,
  audit: AuditLogPort,
  logger: LoggerPort,
): void {
  registerHandler(bus, BillingPurchaseCreatedEvent, new PurchaseCreatedAuditHandler(audit, logger));
  registerHandler(
    bus,
    BillingPurchaseApprovedEvent,
    new PurchaseApprovedAuditHandler(audit, logger),
  );
  registerHandler(
    bus,
    BillingPurchaseReversedEvent,
    new PurchaseReversedAuditHandler(audit, logger),
  );
}
