CREATE TABLE "patch_go_billing" (
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "priceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'none',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patch_go_billing_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "patch_go_billing_stripeCustomerId_key" ON "patch_go_billing"("stripeCustomerId");
CREATE UNIQUE INDEX "patch_go_billing_stripeSubscriptionId_key" ON "patch_go_billing"("stripeSubscriptionId");
ALTER TABLE "patch_go_billing" ADD CONSTRAINT "patch_go_billing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "patch_go_usage" (
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "patch_go_usage_pkey" PRIMARY KEY ("userId", "periodStart")
);

ALTER TABLE "patch_go_usage" ADD CONSTRAINT "patch_go_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
