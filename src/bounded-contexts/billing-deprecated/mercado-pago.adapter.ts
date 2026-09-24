import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { LoggerPort } from '@/shared-kernel';
import {
  type CreateCardOrderInput,
  type CreatePixOrderInput,
  type CreateSubscriptionInput,
  PaymentProviderPort,
  type ProviderOrder,
  type ProviderPayment,
  type ProviderPaymentStatus,
  type ProviderSubscription,
  type ProviderSubscriptionStatus,
  type ProviderWebhookEvent,
  type VerifyWebhookInput,
} from './payment-provider.port';

const API_BASE = 'https://api.mercadopago.com';
const WEBHOOK_TOLERANCE_SECONDS = 300;

const PreapprovalSchema = z
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

const AuthorizedPaymentSchema = z
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

const AuthorizedPaymentSearchSchema = z
  .object({ results: z.array(AuthorizedPaymentSchema).default([]) })
  .passthrough();

const OrderSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    external_reference: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
    status: z.string(),
    status_detail: z.string().nullable().optional(),
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
                paid_amount: z
                  .union([z.string(), z.number()])
                  .transform(Number)
                  .nullable()
                  .optional(),
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

const WebhookSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    type: z.string(),
    action: z.string().default('unknown'),
    data: z.object({ id: z.union([z.string(), z.number()]).transform(String) }).passthrough(),
  })
  .passthrough();

const toCents = (amount: number): number => Math.round(amount * 100);

function subscriptionStatus(status: string): ProviderSubscriptionStatus {
  if (status === 'authorized') return 'active';
  if (status === 'paused') return 'paused';
  if (status === 'cancelled' || status === 'canceled') return 'canceled';
  return 'pending';
}

function paymentStatus(status: string): ProviderPaymentStatus {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'refunded') return 'refunded';
  if (status === 'charged_back') return 'charged_back';
  if (status === 'cancelled' || status === 'canceled' || status === 'expired') return 'canceled';
  if (status === 'processed') return 'approved';
  return 'pending';
}

export class MercadoPagoPaymentAdapter extends PaymentProviderPort {
  constructor(
    private readonly accessToken: string,
    private readonly webhookSecret: string,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    return this.requestSubscription('/preapproval', {
      method: 'POST',
      idempotencyKey: input.localSubscriptionId,
      body: {
        reason: `Patch ${input.plan === 'max' ? 'Max' : 'Go'}`,
        external_reference: `${input.userId}:${input.localSubscriptionId}`,
        payer_email: input.email,
        back_url: input.returnUrl,
        status: input.cardToken ? 'authorized' : 'pending',
        ...(input.cardToken ? { card_token_id: input.cardToken } : {}),
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: input.amountCents / 100,
          currency_id: input.currency,
        },
      },
    });
  }

  async createPixOrder(input: CreatePixOrderInput): Promise<ProviderOrder> {
    const raw = await this.request('/v1/orders', {
      method: 'POST',
      idempotencyKey: input.purchaseId,
      body: {
        type: 'online',
        total_amount: (input.amountCents / 100).toFixed(2),
        external_reference: input.externalReference,
        processing_mode: 'automatic',
        transactions: {
          payments: [
            {
              amount: (input.amountCents / 100).toFixed(2),
              payment_method: { id: 'pix', type: 'bank_transfer' },
              expiration_time: `PT${input.expirationMinutes}M`,
            },
          ],
        },
        payer: { email: input.email },
      },
    });
    return this.toOrder(OrderSchema.parse(raw));
  }

  async createCardOrder(input: CreateCardOrderInput): Promise<ProviderOrder> {
    const raw = await this.request('/v1/orders', {
      method: 'POST',
      idempotencyKey: input.purchaseId,
      body: {
        type: 'online',
        total_amount: (input.amountCents / 100).toFixed(2),
        external_reference: input.externalReference,
        processing_mode: 'automatic',
        transactions: {
          payments: [
            {
              amount: (input.amountCents / 100).toFixed(2),
              payment_method: {
                id: input.paymentMethodId,
                type: 'credit_card',
                token: input.cardToken,
                installments: input.installments,
              },
            },
          ],
        },
        payer: { email: input.email },
      },
    });
    return this.toOrder(OrderSchema.parse(raw));
  }

  async getOrder(id: string): Promise<ProviderOrder> {
    return this.toOrder(
      OrderSchema.parse(
        await this.request(`/v1/orders/${encodeURIComponent(id)}`, { method: 'GET' }),
      ),
    );
  }

  getSubscription(id: string): Promise<ProviderSubscription> {
    return this.requestSubscription(`/preapproval/${encodeURIComponent(id)}`, { method: 'GET' });
  }

  updateSubscriptionAmount(id: string, amountCents: number): Promise<ProviderSubscription> {
    return this.requestSubscription(`/preapproval/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { auto_recurring: { transaction_amount: amountCents / 100, currency_id: 'BRL' } },
    });
  }

  cancelSubscription(id: string): Promise<ProviderSubscription> {
    return this.requestSubscription(`/preapproval/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { status: 'cancelled' },
    });
  }

  updatePaymentMethod(id: string, cardToken: string): Promise<ProviderSubscription> {
    return this.requestSubscription(`/preapproval/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: { card_token_id: cardToken },
    });
  }

  async getAuthorizedPayment(id: string): Promise<ProviderPayment> {
    const raw = await this.request(`/authorized_payments/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    return this.toPayment(AuthorizedPaymentSchema.parse(raw));
  }

  async listAuthorizedPayments(subscriptionId: string): Promise<ReadonlyArray<ProviderPayment>> {
    const query = new URLSearchParams({ preapproval_id: subscriptionId, limit: '100' });
    const raw = await this.request(`/authorized_payments/search?${query.toString()}`, {
      method: 'GET',
    });
    return AuthorizedPaymentSearchSchema.parse(raw).results.map((row) => this.toPayment(row));
  }

  verifyWebhook(input: VerifyWebhookInput): ProviderWebhookEvent {
    const parsed = WebhookSchema.parse(JSON.parse(input.rawBody));
    const parts = new Map(
      input.signature.split(',').map((part) => {
        const [key, ...rest] = part.trim().split('=');
        return [key, rest.join('=')] as const;
      }),
    );
    const timestamp = parts.get('ts');
    const signature = parts.get('v1');
    if (!timestamp || !signature || !/^\d+$/u.test(timestamp) || !/^[a-f\d]{64}$/iu.test(signature))
      throw new Error('Malformed Mercado Pago webhook signature');
    const rawTimestamp = Number(timestamp);
    const timestampSeconds = rawTimestamp > 10_000_000_000 ? rawTimestamp / 1000 : rawTimestamp;
    if (Math.abs(Date.now() / 1000 - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS)
      throw new Error('Expired Mercado Pago webhook signature');
    const manifest = `id:${parsed.data.id.toLowerCase()};request-id:${input.requestId};ts:${timestamp};`;
    const expected = createHmac('sha256', this.webhookSecret).update(manifest).digest('hex');
    const actualBytes = Buffer.from(signature.toLowerCase(), 'hex');
    const expectedBytes = Buffer.from(expected, 'hex');
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes))
      throw new Error('Invalid Mercado Pago webhook signature');
    const type =
      parsed.type === 'subscription_preapproval'
        ? 'subscription'
        : parsed.type === 'subscription_authorized_payment'
          ? 'authorized_payment'
          : parsed.type === 'order'
            ? 'order'
            : parsed.type === 'payment'
              ? 'payment'
              : 'ignored';
    return {
      eventId: parsed.id,
      type,
      resourceId: parsed.data.id,
      action: parsed.action,
    };
  }

  private async requestSubscription(
    path: string,
    options: { method: 'GET' | 'POST' | 'PUT'; body?: unknown; idempotencyKey?: string },
  ): Promise<ProviderSubscription> {
    return this.toSubscription(PreapprovalSchema.parse(await this.request(path, options)));
  }

  private async request(
    path: string,
    options: { method: 'GET' | 'POST' | 'PUT'; body?: unknown; idempotencyKey?: string },
  ): Promise<unknown> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        'content-type': 'application/json',
        ...(options.idempotencyKey ? { 'x-idempotency-key': options.idempotencyKey } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const requestId = response.headers.get('x-request-id');
      const body = (await response.text()).slice(0, 500);
      this.logger?.error(`Mercado Pago API failed (${response.status})`, {
        context: 'MercadoPagoPaymentAdapter',
        requestId,
      });
      throw new Error(`Mercado Pago API ${response.status}: ${body}`);
    }
    return response.json();
  }

  private toSubscription(row: z.infer<typeof PreapprovalSchema>): ProviderSubscription {
    return {
      id: row.id,
      externalReference: row.external_reference ?? null,
      payerId: row.payer_id ?? null,
      version: row.version ?? null,
      status: subscriptionStatus(row.status),
      amountCents: toCents(row.auto_recurring.transaction_amount),
      currency: row.auto_recurring.currency_id.toUpperCase(),
      nextPaymentAt: row.next_payment_date ? new Date(row.next_payment_date) : null,
      checkoutUrl: row.init_point ?? null,
    };
  }

  private toPayment(row: z.infer<typeof AuthorizedPaymentSchema>): ProviderPayment {
    return {
      id: row.payment?.id ?? row.id,
      subscriptionId: row.preapproval_id,
      status: paymentStatus(row.payment?.status ?? row.status),
      amountCents: toCents(row.transaction_amount),
      currency: row.currency_id.toUpperCase(),
      paidAt: row.debit_date
        ? new Date(row.debit_date)
        : row.date_created
          ? new Date(row.date_created)
          : null,
    };
  }

  private toOrder(row: z.infer<typeof OrderSchema>): ProviderOrder {
    const payment = row.transactions.payments[0];
    const status = paymentStatus(payment?.status ?? row.status);
    return {
      id: row.id,
      externalReference: row.external_reference ?? null,
      paymentId: payment?.id ?? null,
      status,
      // `paid_amount` may become zero after a refund; the immutable order
      // amount is what must match the server-priced purchase.
      amountCents: toCents(payment?.amount ?? row.total_amount),
      currency: row.currency.toUpperCase(),
      paidAt:
        status === 'approved' ? new Date(row.last_updated ?? row.date_created ?? Date.now()) : null,
      qrCode: payment?.payment_method?.qr_code ?? null,
      qrCodeBase64: payment?.payment_method?.qr_code_base64 ?? null,
      ticketUrl: payment?.payment_method?.ticket_url ?? null,
    };
  }
}
