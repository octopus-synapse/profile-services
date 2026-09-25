# Mercado Pago billing

Patch uses Mercado Pago's transparent integrations on the web. Card details are
tokenized by Mercado Pago.js in the browser and never reach the Patch API.

## Offers

| Plan | Payment | Term | Price |
| --- | --- | ---: | ---: |
| Go | recurring card | monthly | R$ 39,99 |
| Go | Pix | 3 months | R$ 109,90 |
| Go | Pix | 12 months | R$ 399,90 |
| Max | recurring card | monthly | R$ 150,00 |
| Max | Pix | 3 months | R$ 399,90 |
| Max | Pix | 12 months | R$ 1.199,90 |
| Max founder | Pix | 12 months | R$ 999,90 |

The founder offer reserves one of 100 slots for the 30-minute lifetime of its
Pix checkout. Only approved purchases consume a slot permanently.

## Required credentials

Create an application in Mercado Pago Developers and configure:

- `MERCADO_PAGO_ORDERS_ACCESS_TOKEN` and `MERCADO_PAGO_ORDERS_WEBHOOK_SECRET`
  on the API for Checkout Transparente via Orders;
- `MERCADO_PAGO_SUBSCRIPTIONS_ACCESS_TOKEN` and
  `MERCADO_PAGO_SUBSCRIPTIONS_WEBHOOK_SECRET` on the API for recurring billing;
- the corresponding `MERCADO_PAGO_ORDERS_PUBLIC_KEY` and
  `MERCADO_PAGO_SUBSCRIPTIONS_PUBLIC_KEY` values, returned only to the relevant
  internal card form;
- `BILLING_ENABLED=true` when the database migration and webhook are ready.

`BILLING_CARD_ENABLED` and `BILLING_PIX_ENABLED` are independent, optional
rollout switches. Both default to enabled when omitted.

Register the HTTPS webhook endpoint exposed by the API and enable subscription
preapproval, authorized subscription payment, order, and payment topics. The
handler validates Mercado Pago's `x-signature` and `x-request-id` headers before
reading provider state.

## Access and reconciliation

An initiated payment never grants access. A Mercado Pago-approved authorized
payment or order creates a provider-independent entitlement. Pending orders and
subscriptions are reconciled in the background, so a delayed or duplicated
webhook is safe.

Pix access is prepaid and quota resets monthly within the purchased term. Buying
the same plan extends the current entitlement. Upgrading to Max applies the unused
value immediately; any surplus is stored in the immutable Patch credit ledger,
with no expiration, transfer, or cash withdrawal. A recurring Max-to-Go downgrade
is scheduled for the next approved renewal. Prepaid Max cannot be downgraded before
expiry, and prepaid Go can upgrade to Max through Pix. Moving from recurring card
to Pix cancels the recurring charge before the new entitlement is activated.

Mobile store billing is deliberately separate. Google Play and Apple purchases
must use their native billing and proration mechanisms when those clients are
implemented; they must not also create Patch ledger credit for the same change.
