import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { CannotSendMessageToUserException } from '../../domain/exceptions/collaboration.exceptions';
import { BlockedUserRepositoryPort } from '../application/ports/chat.port';
import { MessagePrivacyPolicyPort } from '../application/ports/message-privacy.port';

/**
 * Enforces blocking + `UserPreferences.messagePrivacy` on every
 * conversation-create path. Recruiter detection uses the denormalized
 * `User.roles` array (legacy RBAC shadow) — sufficient for the
 * RECRUITERS_ONLY gate; swap for `AuthorizationCheckPort.hasPermission`
 * once that port is wired into the collaboration composition.
 */
export class MessagePrivacyPolicyService extends MessagePrivacyPolicyPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockedUserRepo: BlockedUserRepositoryPort,
  ) {
    super();
  }

  async assertCanMessage(senderId: string, recipientId: string): Promise<void> {
    if (await this.blockedUserRepo.isBlockedBetween(senderId, recipientId)) {
      throw new CannotSendMessageToUserException();
    }

    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId: recipientId },
      select: { messagePrivacy: true },
    });
    const privacy = prefs?.messagePrivacy ?? 'EVERYONE';

    if (privacy === 'NOBODY') {
      throw new CannotSendMessageToUserException();
    }
    if (privacy === 'RECRUITERS_ONLY' && !(await this.isRecruiter(senderId))) {
      throw new CannotSendMessageToUserException();
    }
  }

  private async isRecruiter(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
    return (user?.roles ?? []).includes('recruiter');
  }
}
