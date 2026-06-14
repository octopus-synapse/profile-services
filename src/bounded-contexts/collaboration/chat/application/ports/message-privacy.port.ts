/**
 * Gate for "can sender start/continue a conversation with recipient?". Combines
 * blocking with the recipient's `UserPreferences.messagePrivacy`:
 *  - EVERYONE        → anyone (subject to blocking)
 *  - RECRUITERS_ONLY → only users with the recruiter role
 *  - NOBODY          → no one
 *
 * Enforced on every conversation-create path (send-message, get-conversation-id)
 * so the privacy choice can't be bypassed by pre-creating a conversation.
 */
export abstract class MessagePrivacyPolicyPort {
  /** Throws `CannotSendMessageToUserException` when messaging is not allowed. */
  abstract assertCanMessage(senderId: string, recipientId: string): Promise<void>;
}
