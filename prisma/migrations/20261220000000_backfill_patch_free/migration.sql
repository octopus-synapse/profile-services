ALTER TABLE "patch_go_billing" ALTER COLUMN "plan" SET DEFAULT 'free';

-- Accounts without a subscription now have an explicit Free plan. Keep
-- Stripe-backed subscriptions intact so paid users retain their access.
UPDATE "patch_go_billing"
SET "plan" = 'free'
WHERE "stripeSubscriptionId" IS NULL AND "status" NOT IN ('active', 'trialing');

INSERT INTO "patch_go_billing" ("userId", "plan", "status", "updatedAt")
SELECT "id", 'free', 'none', CURRENT_TIMESTAMP FROM "User"
ON CONFLICT ("userId") DO NOTHING;
