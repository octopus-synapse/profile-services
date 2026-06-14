import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { AuthorizationCheckPort } from '@/shared-kernel/authorization/authorization-check.port';
import { CannotSendMessageToUserException } from '../../domain/exceptions/collaboration.exceptions';
import { BlockedUserRepositoryPort } from '../application/ports/chat.port';
import { MessagePrivacyPolicyPort } from '../application/ports/message-privacy.port';

/**
 * Enforces blocking + `UserPreferences.messagePrivacy` on every
 * conversation-create path. Recruiter detection goes through the
 * `AuthorizationCheckPort` (RBAC permission `job:create`), so it tracks the
 * real permission model rather than a denormalized role shadow.
 */
export class MessagePrivacyPolicyService extends MessagePrivacyPolicyPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockedUserRepo: BlockedUserRepositoryPort,
    private readonly authCheck: AuthorizationCheckPort,
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
    // A recruiter is anyone the RBAC grants job-posting permission.
    return this.authCheck.hasPermission(userId, 'job', 'create');
  }
}
