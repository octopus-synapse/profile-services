-- Settings feature data model: verification-code purposes (email/password
-- change), profile-visibility + message-privacy enums, notification channels,
-- OAuth connected-account timestamps, and Expo push devices.

-- 1. New enums --------------------------------------------------------------
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFY', 'EMAIL_CHANGE', 'PASSWORD_CHANGE');
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'RECRUITERS_ONLY', 'PRIVATE');
CREATE TYPE "MessagePrivacy" AS ENUM ('EVERYONE', 'RECRUITERS_ONLY', 'NOBODY');
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- 2. NotificationType: new chat type. (PG12+ allows ADD VALUE in a tx as long
--    as the value isn't referenced in the same tx — it isn't here.)
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_RECEIVED';

-- 3. EmailVerificationToken: purpose discriminator + pending payloads -------
ALTER TABLE "EmailVerificationToken"
  ADD COLUMN "purpose" "VerificationPurpose" NOT NULL DEFAULT 'EMAIL_VERIFY',
  ADD COLUMN "pendingEmail" TEXT,
  ADD COLUMN "pendingPasswordHash" TEXT;
CREATE INDEX "EmailVerificationToken_userId_purpose_idx" ON "EmailVerificationToken"("userId", "purpose");

-- 4. Account.createdAt — existing rows backfill to migration time -----------
ALTER TABLE "Account" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 5. UserPreferences.profileVisibility: free-string -> strict enum.
--    Hand-authored data migration (do NOT drop+recreate). Legacy values:
--    'public'/'link'/'unlisted' -> PUBLIC (link/unlisted were "accessible by
--    URL"); everything else (incl. 'private') -> PRIVATE. App is pre-launch,
--    so no RECRUITERS_ONLY rows exist yet.
ALTER TABLE "UserPreferences" ADD COLUMN "profileVisibility_new" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE';
UPDATE "UserPreferences" SET "profileVisibility_new" = CASE
  WHEN lower("profileVisibility") IN ('public', 'link', 'unlisted') THEN 'PUBLIC'::"ProfileVisibility"
  WHEN lower("profileVisibility") = 'recruiters_only' THEN 'RECRUITERS_ONLY'::"ProfileVisibility"
  ELSE 'PRIVATE'::"ProfileVisibility"
END;
ALTER TABLE "UserPreferences" DROP COLUMN "profileVisibility";
ALTER TABLE "UserPreferences" RENAME COLUMN "profileVisibility_new" TO "profileVisibility";

-- 6. UserPreferences.messagePrivacy ----------------------------------------
ALTER TABLE "UserPreferences" ADD COLUMN "messagePrivacy" "MessagePrivacy" NOT NULL DEFAULT 'EVERYONE';

-- 7. NotificationPreference per-channel toggles ----------------------------
ALTER TABLE "NotificationPreference"
  ADD COLUMN "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT false;

-- 8. PushDevice — one row per registered Expo push token -------------------
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL DEFAULT uuidv7(),
    "userId" TEXT NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushDevice_expoPushToken_key" ON "PushDevice"("expoPushToken");
CREATE INDEX "PushDevice_userId_idx" ON "PushDevice"("userId");
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
