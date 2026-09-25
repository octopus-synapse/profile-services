import { afterEach, describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import { MercadoPagoPaymentAdapter } from './mercado-pago-payment.adapter';

const webhookSigningKey = ['webhook', 'signing', 'key'].join('-');
const originalFetch = globalThis.fetch;
const credentials = {
  ordersAccessToken: 'orders-token',
  subscriptionsAccessToken: 'subscriptions-token',
  webhookSecrets: [webhookSigningKey],
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('MercadoPagoPaymentAdapter', () => {
  it('lists subscription charges without a rejected limit parameter', async () => {
    let requestUrl = '';
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestUrl = String(input);
      return new Response(
        JSON.stringify({
          paging: { offset: 0, limit: 12, total: 1 },
          results: [
            {
              id: 'invoice-1',
              preapproval_id: 'subscription-1',
              status: 'processed',
              transaction_amount: 39.99,
              currency_id: 'BRL',
              date_created: '2026-09-25T15:00:00.000-03:00',
              payment: { id: 'payment-1', status: 'approved' },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    const payments = await new MercadoPagoPaymentAdapter(credentials).listAuthorizedPayments(
      'subscription-1',
    );

    expect(requestUrl).toContain('preapproval_id=subscription-1');
    expect(requestUrl).not.toContain('limit=');
    expect(payments).toMatchObject([
      { id: 'payment-1', subscriptionId: 'subscription-1', status: 'approved', amountCents: 3999 },
    ]);
  });

  it('follows the provider default pagination with offset only', async () => {
    const urls: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      urls.push(url);
      const secondPage = url.includes('offset=1');
      return new Response(
        JSON.stringify({
          paging: { offset: secondPage ? 1 : 0, limit: 1, total: 2 },
          results: [
            {
              id: secondPage ? 'invoice-2' : 'invoice-1',
              preapproval_id: 'subscription-1',
              status: 'processed',
              transaction_amount: 39.99,
              currency_id: 'BRL',
              payment: { id: secondPage ? 'payment-2' : 'payment-1', status: 'approved' },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    const payments = await new MercadoPagoPaymentAdapter(credentials).listAuthorizedPayments(
      'subscription-1',
    );

    expect(urls).toHaveLength(2);
    expect(urls[0]).not.toContain('offset=');
    expect(urls[1]).toContain('offset=1');
    expect(urls.every((url) => !url.includes('limit='))).toBe(true);
    expect(payments.map((payment) => payment.id)).toEqual(['payment-1', 'payment-2']);
  });

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

  it('creates a Pix order and returns its copy-and-paste code and QR image', async () => {
    let request: RequestInit | undefined;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      request = init;
      return new Response(
        JSON.stringify({
          id: 'order-pix-1',
          external_reference: 'patch_purchase1',
          status: 'action_required',
          total_amount: '109.90',
          currency: 'BRL',
          transactions: {
            payments: [
              {
                id: 'payment-pix-1',
                status: 'action_required',
                amount: '109.90',
                payment_method: {
                  qr_code: 'pix-copy-and-paste',
                  qr_code_base64: 'base64-qr-image',
                  ticket_url: 'https://www.mercadopago.com.br/ticket',
                },
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    const order = await new MercadoPagoPaymentAdapter(credentials).createPixOrder({
      purchaseId: 'purchase-1',
      externalReference: 'patch_purchase1',
      email: 'buyer@testuser.com',
      firstName: 'APRO',
      amountCents: 10990,
      currency: 'BRL',
      expirationMinutes: 30,
    });

    expect(JSON.parse(String(request?.body))).toMatchObject({
      external_reference: 'patch_purchase1',
      payer: { email: 'buyer@testuser.com', first_name: 'APRO' },
      transactions: { payments: [{ payment_method: { id: 'pix', type: 'bank_transfer' } }] },
    });
    expect(order).toMatchObject({
      status: 'pending',
      amountCents: 10990,
      qrCode: 'pix-copy-and-paste',
      qrCodeBase64: 'base64-qr-image',
    });

    await new MercadoPagoPaymentAdapter(credentials).createPixOrder({
      purchaseId: 'purchase-2',
      externalReference: 'patch_purchase2',
      email: 'person@example.com',
      amountCents: 10990,
      currency: 'BRL',
      expirationMinutes: 30,
    });
    expect(JSON.parse(String(request?.body)).payer).toEqual({ email: 'person@example.com' });
  });

  it('cancels an unpaid order with its own idempotency key', async () => {
    let url = '';
    let request: RequestInit | undefined;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      url = String(input);
      request = init;
      return new Response(
        JSON.stringify({
          id: 'order-pix-1',
          external_reference: 'patch_purchase1',
          status: 'canceled',
          total_amount: '109.90',
          currency: 'BRL',
          transactions: {
            payments: [{ id: 'payment-pix-1', status: 'action_required', amount: '109.90' }],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;

    const order = await new MercadoPagoPaymentAdapter(credentials).cancelOrder(
      'order-pix-1',
      'cancel-purchase-1',
    );

    expect(url).toBe('https://api.mercadopago.com/v1/orders/order-pix-1/cancel');
    expect(request?.method).toBe('POST');
    expect((request?.headers as Record<string, string>)['x-idempotency-key']).toBe(
      'cancel-purchase-1',
    );
    expect(order.status).toBe('canceled');
  });

  it('maps a transparent one-time card order without redirecting the customer', async () => {
    let request: RequestInit | undefined;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      request = init;
      return new Response(
        JSON.stringify({
          id: 'order-1',
          external_reference: 'patch_purchase1',
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
      externalReference: 'patch_purchase1',
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
    const digest = createHmac('sha256', webhookSigningKey)
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
