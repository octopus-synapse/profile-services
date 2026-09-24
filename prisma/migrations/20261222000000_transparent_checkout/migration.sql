CREATE TABLE "billing_purchases" (
  "id" TEXT NOT NULL DEFAULT uuidv7(),
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "offerCode" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'created',
  "amountCents" INTEGER NOT NULL,
  "listAmountCents" INTEGER NOT NULL,
  "prorationCreditCents" INTEGER NOT NULL DEFAULT 0,
  "creditAppliedCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "termMonths" INTEGER NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'mercado_pago',
  "providerOrderId" TEXT,
  "providerPaymentId" TEXT,
  "providerSubscriptionId" TEXT,
  "externalReference" TEXT NOT NULL,
  "pixQrCode" TEXT,
  "pixQrCodeBase64" TEXT,
  "pixTicketUrl" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_entitlements" (
  "id" TEXT NOT NULL DEFAULT uuidv7(),
  "userId" TEXT NOT NULL,
  "purchaseId" TEXT,
  "source" TEXT NOT NULL,
  "sourceRef" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "quotaAnchorAt" TIMESTAMP(3) NOT NULL,
  "terminatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_credit_entries" (
  "id" TEXT NOT NULL DEFAULT uuidv7(),
  "userId" TEXT NOT NULL,
  "purchaseId" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "reason" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_credit_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_purchases_providerOrderId_key" ON "billing_purchases"("providerOrderId");
CREATE UNIQUE INDEX "billing_purchases_providerPaymentId_key" ON "billing_purchases"("providerPaymentId");
CREATE UNIQUE INDEX "billing_purchases_externalReference_key" ON "billing_purchases"("externalReference");
CREATE INDEX "billing_purchases_userId_createdAt_idx" ON "billing_purchases"("userId", "createdAt");
CREATE INDEX "billing_purchases_offerCode_status_expiresAt_idx" ON "billing_purchases"("offerCode", "status", "expiresAt");
CREATE INDEX "billing_purchases_status_expiresAt_idx" ON "billing_purchases"("status", "expiresAt");
CREATE UNIQUE INDEX "billing_entitlements_source_sourceRef_key" ON "billing_entitlements"("source", "sourceRef");
CREATE INDEX "billing_entitlements_userId_startsAt_endsAt_idx" ON "billing_entitlements"("userId", "startsAt", "endsAt");
CREATE UNIQUE INDEX "billing_credit_entries_reference_key" ON "billing_credit_entries"("reference");
CREATE INDEX "billing_credit_entries_userId_createdAt_idx" ON "billing_credit_entries"("userId", "createdAt");

ALTER TABLE "billing_purchases" ADD CONSTRAINT "billing_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_purchases" ADD CONSTRAINT "billing_purchases_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "billing_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_entitlements" ADD CONSTRAINT "billing_entitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_entitlements" ADD CONSTRAINT "billing_entitlements_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "billing_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_credit_entries" ADD CONSTRAINT "billing_credit_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_credit_entries" ADD CONSTRAINT "billing_credit_entries_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "billing_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve paid access when this is deployed over the provider-neutral schema.
INSERT INTO "billing_entitlements" (
  "id", "userId", "source", "sourceRef", "plan", "status",
  "startsAt", "endsAt", "quotaAnchorAt", "createdAt", "updatedAt"
)
SELECT uuidv7(), "userId", 'mercado_pago_subscription', "providerSubscriptionId",
       "plan", 'active', "periodStart", "periodEnd", "periodStart", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "billing_subscriptions"
WHERE "providerSubscriptionId" IS NOT NULL
  AND "periodStart" IS NOT NULL
  AND "periodEnd" IS NOT NULL
  AND "periodEnd" > CURRENT_TIMESTAMP
ON CONFLICT ("source", "sourceRef") DO NOTHING;
