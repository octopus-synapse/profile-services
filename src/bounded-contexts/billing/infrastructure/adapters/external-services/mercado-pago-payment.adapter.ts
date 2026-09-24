import { createHmac, timingSafeEqual } from 'node:crypto';
import type { LoggerPort } from '@/shared-kernel';
import {
  type CreateCardOrderInput,
  type CreatePixOrderInput,
  type CreateSubscriptionInput,
  PaymentProviderPort,
  type ProviderOrder,
  type ProviderPayment,
  type ProviderSubscription,
  type ProviderWebhookEvent,
  type VerifyWebhookInput,
} from '../../../domain/ports/payment-provider.port';
import {
  AuthorizedPaymentSchema,
  AuthorizedPaymentSearchSchema,
  OrderSchema,
  PreapprovalSchema,
  toOrder,
  toPayment,
  toSubscription,
  WebhookSchema,
} from './mercado-pago.mapper';

const API_BASE = 'https://api.mercadopago.com';
const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface MercadoPagoCredentials {
  readonly ordersAccessToken: string;
  readonly subscriptionsAccessToken: string;
  readonly webhookSecrets: ReadonlyArray<string>;
}

export class MercadoPagoPaymentAdapter extends PaymentProviderPort {
  constructor(
    private readonly credentials: MercadoPagoCredentials,
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
    const raw = await this.request('/v1/orders', 'orders', {
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
    return toOrder(OrderSchema.parse(raw));
  }

  async createCardOrder(input: CreateCardOrderInput): Promise<ProviderOrder> {
    const raw = await this.request('/v1/orders', 'orders', {
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
    return toOrder(OrderSchema.parse(raw));
  }

  async getOrder(id: string): Promise<ProviderOrder> {
    return toOrder(
      OrderSchema.parse(
        await this.request(`/v1/orders/${encodeURIComponent(id)}`, 'orders', { method: 'GET' }),
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
    const raw = await this.request(
      `/authorized_payments/${encodeURIComponent(id)}`,
      'subscriptions',
      {
        method: 'GET',
      },
    );
    return toPayment(AuthorizedPaymentSchema.parse(raw));
  }

  async listAuthorizedPayments(subscriptionId: string): Promise<ReadonlyArray<ProviderPayment>> {
    const query = new URLSearchParams({ preapproval_id: subscriptionId, limit: '100' });
    const raw = await this.request(
      `/authorized_payments/search?${query.toString()}`,
      'subscriptions',
      {
        method: 'GET',
      },
    );
    return AuthorizedPaymentSearchSchema.parse(raw).results.map(toPayment);
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
    const actualBytes = Buffer.from(signature.toLowerCase(), 'hex');
    const valid = this.credentials.webhookSecrets.some((secret) => {
      const expectedBytes = Buffer.from(
        createHmac('sha256', secret).update(manifest).digest('hex'),
        'hex',
      );
      return (
        actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
      );
    });
    if (!valid) throw new Error('Invalid Mercado Pago webhook signature');
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
    return toSubscription(
      PreapprovalSchema.parse(await this.request(path, 'subscriptions', options)),
    );
  }

  private async request(
    path: string,
    credential: 'orders' | 'subscriptions',
    options: { method: 'GET' | 'POST' | 'PUT'; body?: unknown; idempotencyKey?: string },
  ): Promise<unknown> {
    const accessToken =
      credential === 'orders'
        ? this.credentials.ordersAccessToken
        : this.credentials.subscriptionsAccessToken;
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method,
      headers: {
        authorization: `Bearer ${accessToken}`,
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
}
