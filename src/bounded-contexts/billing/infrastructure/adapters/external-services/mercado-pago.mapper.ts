import { z } from 'zod';
import type {
  ProviderOrder,
  ProviderPayment,
  ProviderPaymentStatus,
  ProviderSubscription,
  ProviderSubscriptionStatus,
} from '../../../domain/ports/payment-provider.port';

export const PreapprovalSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    external_reference: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
    payer_id: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
    version: z.number().int().nullable().optional(),
    status: z.string(),
    init_point: z.string().url().nullable().optional(),
    next_payment_date: z.string().datetime({ offset: true }).nullable().optional(),
    auto_recurring: z
      .object({
        transaction_amount: z.union([z.number(), z.string()]).transform(Number),
        currency_id: z.string(),
      })
      .passthrough(),
  })
  .passthrough();
export const AuthorizedPaymentSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    preapproval_id: z.union([z.string(), z.number()]).transform(String),
    status: z.string(),
    transaction_amount: z.union([z.number(), z.string()]).transform(Number),
    currency_id: z.string(),
    debit_date: z.string().datetime({ offset: true }).nullable().optional(),
    date_created: z.string().datetime({ offset: true }).nullable().optional(),
    payment: z
      .object({
        id: z.union([z.string(), z.number()]).transform(String).optional(),
        status: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export const AuthorizedPaymentSearchSchema = z
  .object({
    results: z.array(AuthorizedPaymentSchema).default([]),
    paging: z.object({ offset: z.number(), limit: z.number(), total: z.number() }).optional(),
  })
  .passthrough();
export const OrderSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    external_reference: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
    status: z.string(),
    total_amount: z.union([z.string(), z.number()]).transform(Number),
    currency: z.string().default('BRL'),
    date_created: z.string().datetime({ offset: true }).nullable().optional(),
    last_updated: z.string().datetime({ offset: true }).nullable().optional(),
    transactions: z
      .object({
        payments: z
          .array(
            z
              .object({
                id: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
                status: z.string().nullable().optional(),
                amount: z.union([z.string(), z.number()]).transform(Number).nullable().optional(),
                payment_method: z
                  .object({
                    ticket_url: z.string().url().nullable().optional(),
                    qr_code: z.string().nullable().optional(),
                    qr_code_base64: z.string().nullable().optional(),
                  })
                  .passthrough()
                  .optional(),
              })
              .passthrough(),
          )
          .default([]),
      })
      .passthrough(),
  })
  .passthrough();
export const WebhookSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    type: z.string(),
    action: z.string().default('unknown'),
    data: z.object({ id: z.union([z.string(), z.number()]).transform(String) }).passthrough(),
  })
  .passthrough();

const cents = (amount: number) => Math.round(amount * 100);
export function paymentStatus(status: string): ProviderPaymentStatus {
  if (status === 'approved' || status === 'processed') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'refunded') return 'refunded';
  if (status === 'charged_back') return 'charged_back';
  if (['cancelled', 'canceled', 'expired'].includes(status)) return 'canceled';
  return 'pending';
}
export function toSubscription(row: z.infer<typeof PreapprovalSchema>): ProviderSubscription {
  const status: ProviderSubscriptionStatus =
    row.status === 'authorized'
      ? 'active'
      : row.status === 'paused'
        ? 'paused'
        : ['cancelled', 'canceled'].includes(row.status)
          ? 'canceled'
          : 'pending';
  return {
    id: row.id,
    externalReference: row.external_reference ?? null,
    payerId: row.payer_id ?? null,
    version: row.version ?? null,
    status,
    amountCents: cents(row.auto_recurring.transaction_amount),
    currency: row.auto_recurring.currency_id.toUpperCase(),
    nextPaymentAt: row.next_payment_date ? new Date(row.next_payment_date) : null,
    checkoutUrl: row.init_point ?? null,
  };
}
export function toPayment(row: z.infer<typeof AuthorizedPaymentSchema>): ProviderPayment {
  return {
    id: row.payment?.id ?? row.id,
    subscriptionId: row.preapproval_id,
    status: paymentStatus(row.payment?.status ?? row.status),
    amountCents: cents(row.transaction_amount),
    currency: row.currency_id.toUpperCase(),
    paidAt: row.debit_date
      ? new Date(row.debit_date)
      : row.date_created
        ? new Date(row.date_created)
        : null,
  };
}
export function toOrder(row: z.infer<typeof OrderSchema>): ProviderOrder {
  const payment = row.transactions.payments[0];
  // The order is authoritative for terminal states. A cancellation response
  // can still carry an older action_required payment snapshot.
  const orderStatus = paymentStatus(row.status);
  const status = ['approved', 'canceled', 'refunded', 'charged_back'].includes(orderStatus)
    ? orderStatus
    : paymentStatus(payment?.status ?? row.status);
  return {
    id: row.id,
    externalReference: row.external_reference ?? null,
    paymentId: payment?.id ?? null,
    status,
    amountCents: cents(payment?.amount ?? row.total_amount),
    currency: row.currency.toUpperCase(),
    paidAt:
      status === 'approved' ? new Date(row.last_updated ?? row.date_created ?? Date.now()) : null,
    qrCode: payment?.payment_method?.qr_code ?? null,
    qrCodeBase64: payment?.payment_method?.qr_code_base64 ?? null,
    ticketUrl: payment?.payment_method?.ticket_url ?? null,
  };
}
