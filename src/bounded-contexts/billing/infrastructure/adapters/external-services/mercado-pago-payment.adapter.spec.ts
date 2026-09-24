import { afterEach, describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import { MercadoPagoPaymentAdapter } from './mercado-pago-payment.adapter';

const secret = 'webhook-secret';
const originalFetch = globalThis.fetch;
const credentials = {
  ordersAccessToken: 'orders-token',
  subscriptionsAccessToken: 'subscriptions-token',
  webhookSecrets: [secret],
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('MercadoPagoPaymentAdapter', () => {
  it('creates a recurring card subscription with a token and no redirect flow', async () => {
    let request: RequestInit | undefined;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      request = init;
      return new Response(
        JSON.stringify({
          id: 'subscription-1',
          external_reference: 'user-1:local-sub-1',
          payer_id: 'payer-1',
          version: 1,
          status: 'authorized',
          init_point: null,
          auto_recurring: { transaction_amount: 39.99, currency_id: 'BRL' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    const subscription = await new MercadoPagoPaymentAdapter(credentials).createSubscription({
      localSubscriptionId: 'local-sub-1',
      userId: 'user-1',
      email: 'person@example.com',
      plan: 'go',
      amountCents: 3999,
      currency: 'BRL',
      returnUrl: 'https://patchcareers.org/billing/checkout',
      cardToken: 'card-token',
    });

    expect(JSON.parse(String(request?.body))).toMatchObject({
      status: 'authorized',
      card_token_id: 'card-token',
      payer_email: 'person@example.com',
      auto_recurring: { transaction_amount: 39.99, currency_id: 'BRL' },
    });
    expect(new Headers(request?.headers).get('authorization')).toBe('Bearer subscriptions-token');
    expect(subscription).toMatchObject({
      id: 'subscription-1',
      status: 'active',
      amountCents: 3999,
      checkoutUrl: null,
    });
  });

  it('maps a transparent one-time card order without redirecting the customer', async () => {
    let request: RequestInit | undefined;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      request = init;
      return new Response(
        JSON.stringify({
          id: 'order-1',
          external_reference: 'patch:purchase-1',
          status: 'processed',
          total_amount: '55.01',
          currency: 'BRL',
          last_updated: new Date().toISOString(),
          transactions: {
            payments: [
              { id: 'payment-1', status: 'approved', amount: '55.01', paid_amount: '55.01' },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    const order = await new MercadoPagoPaymentAdapter(credentials).createCardOrder({
      purchaseId: 'purchase-1',
      externalReference: 'patch:purchase-1',
      email: 'person@example.com',
      amountCents: 5501,
      currency: 'BRL',
      cardToken: 'card-token',
      paymentMethodId: 'visa',
      installments: 1,
    });

    expect(JSON.parse(String(request?.body)).transactions.payments[0]).toMatchObject({
      amount: '55.01',
      payment_method: {
        id: 'visa',
        type: 'credit_card',
        token: 'card-token',
        installments: 1,
      },
    });
    expect(new Headers(request?.headers).get('authorization')).toBe('Bearer orders-token');
    expect(order).toMatchObject({ id: 'order-1', status: 'approved', amountCents: 5501 });
  });

  it.each([
    Date.now().toString(),
    Math.floor(Date.now() / 1000).toString(),
  ])('accepts a signed webhook timestamp in seconds or milliseconds: %s', (timestamp) => {
    const body = JSON.stringify({
      id: 124,
      type: 'order',
      action: 'order.processed',
      data: { id: 'ORD01TEST' },
    });
    const digest = createHmac('sha256', secret)
      .update(`id:ord01test;request-id:req-2;ts:${timestamp};`)
      .digest('hex');
    const adapter = new MercadoPagoPaymentAdapter(credentials);

    expect(
      adapter.verifyWebhook({
        rawBody: body,
        signature: `ts=${timestamp},v1=${digest}`,
        requestId: 'req-2',
      }),
    ).toMatchObject({ type: 'order', resourceId: 'ORD01TEST' });
    expect(() =>
      adapter.verifyWebhook({
        rawBody: body.replace('ORD01TEST', 'ORD01OTHER'),
        signature: `ts=${timestamp},v1=${digest}`,
        requestId: 'req-2',
      }),
    ).toThrow('Invalid Mercado Pago webhook signature');
  });
});
