-- CreateIndex
CREATE INDEX "conversations_participant1Id_lastMessageAt_idx" ON "conversations"("participant1Id", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_participant2Id_lastMessageAt_idx" ON "conversations"("participant2Id", "lastMessageAt");

-- CreateIndex
CREATE INDEX "resume_view_events_resumeId_createdAt_idx" ON "resume_view_events"("resumeId", "createdAt");
