import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class ChatPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async setPin(conversationId: string, userId: string, pinned: boolean): Promise<void> {
    await this.assertParticipant(conversationId, userId);
    await this.prisma.conversationPreference.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, pinned },
      update: { pinned },
    });
  }

  async setMute(
    conversationId: string,
    userId: string,
    muted: boolean,
    mutedUntilIso?: string,
  ): Promise<{ muted: boolean; mutedUntil: string | null }> {
    await this.assertParticipant(conversationId, userId);
    const mutedUntil = muted && mutedUntilIso ? new Date(mutedUntilIso) : null;
    await this.prisma.conversationPreference.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId, muted, mutedUntil },
      update: { muted, mutedUntil },
    });
    return { muted, mutedUntil: mutedUntil?.toISOString() ?? null };
  }

  private async assertParticipant(conversationId: string, userId: string): Promise<void> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { participant1Id: true, participant2Id: true },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      throw new ForbiddenException('Not a participant of this conversation');
    }
  }
}
