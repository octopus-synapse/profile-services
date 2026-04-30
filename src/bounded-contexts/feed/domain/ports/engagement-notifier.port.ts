/**
 * Outbound port for engagement notifications. The feed BC fires "post
 * liked" / "post reposted" events and lets a downstream adapter decide
 * how to deliver them (in-app, email, SSE) — the use cases just call
 * this port.
 */

export type EngagementNotificationType = 'POST_LIKED' | 'POST_REPOSTED';

export interface EngagementNotificationInput {
  readonly recipientId: string;
  readonly actorId: string;
  readonly postId: string;
  readonly type: EngagementNotificationType;
  readonly message: string;
}

export abstract class EngagementNotifierPort {
  abstract notify(input: EngagementNotificationInput): Promise<void>;
}
