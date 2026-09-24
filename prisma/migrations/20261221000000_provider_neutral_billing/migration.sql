-- Provider-neutral billing tables. There are no legacy subscribers to migrate,
-- so the Stripe-specific projection is removed in the same release.
CREATE TABLE "billing_subscriptions" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "providerPayerId" TEXT,
    "providerVersion" INTEGER,
    "checkoutUrl" TEXT,
    "plan" TEXT NOT NULL,
    "pendingPlan" TEXT,
    "status" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "nextPaymentAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_payments" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "subscriptionId" TEXT NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_webhook_events" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_payment_method_sessions" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "subscriptionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "returnUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_payment_method_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_subscriptions_providerSubscriptionId_key" ON "billing_subscriptions"("providerSubscriptionId");
CREATE INDEX "billing_subscriptions_userId_updatedAt_idx" ON "billing_subscriptions"("userId", "updatedAt");
CREATE INDEX "billing_subscriptions_status_nextPaymentAt_idx" ON "billing_subscriptions"("status", "nextPaymentAt");
CREATE UNIQUE INDEX "billing_subscriptions_one_open_per_user" ON "billing_subscriptions"("userId") WHERE "status" IN ('creating', 'pending', 'active', 'paused');
CREATE UNIQUE INDEX "billing_payments_providerPaymentId_key" ON "billing_payments"("providerPaymentId");
CREATE INDEX "billing_payments_subscriptionId_paidAt_idx" ON "billing_payments"("subscriptionId", "paidAt");
CREATE UNIQUE INDEX "billing_webhook_events_provider_providerEventId_key" ON "billing_webhook_events"("provider", "providerEventId");
CREATE INDEX "billing_webhook_events_status_updatedAt_idx" ON "billing_webhook_events"("status", "updatedAt");
CREATE UNIQUE INDEX "billing_payment_method_sessions_tokenHash_key" ON "billing_payment_method_sessions"("tokenHash");
CREATE INDEX "billing_payment_method_sessions_subscriptionId_expiresAt_idx" ON "billing_payment_method_sessions"("subscriptionId", "expiresAt");

ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "billing_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_payment_method_sessions" ADD CONSTRAINT "billing_payment_method_sessions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "billing_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "patch_go_billing";
