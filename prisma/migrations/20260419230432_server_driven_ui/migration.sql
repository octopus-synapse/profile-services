-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "messageKey" TEXT,
ADD COLUMN     "messageParams" JSONB;

-- CreateTable
CREATE TABLE "user_ui_state" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ui_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_ui_state_userId_idx" ON "user_ui_state"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_ui_state_userId_key_key" ON "user_ui_state"("userId", "key");
