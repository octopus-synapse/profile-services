-- Orders API rejects the old `patch:<id>` reference before creating an order.
-- Only release attempts that have no provider order/payment; keep the rows for
-- audit and let the customer create a fresh checkout with the corrected format.
UPDATE billing_purchases
SET status = 'rejected',
    "failedAt" = COALESCE("failedAt", NOW()),
    "updatedAt" = NOW()
WHERE kind IN ('pix_prepaid', 'card_plan_change')
  AND status = 'created'
  AND "providerOrderId" IS NULL
  AND "providerPaymentId" IS NULL
  AND "externalReference" LIKE 'patch:%';
