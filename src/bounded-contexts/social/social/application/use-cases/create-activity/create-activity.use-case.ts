import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { ActivityType } from '@prisma/client';
import type { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import {
  ActivityCreatedEvent,
  type SocialActivityType,
} from '../../../../shared-kernel/domain/events';
import type { ActivityRepositoryPort, ActivityWithUser } from '../../ports/activity.port';
import type { FollowRepositoryPort } from '../../ports/follow.port';

const ACTIVITY_TYPE_MAPPING: Record<ActivityType, SocialActivityType> = {
  RESUME_CREATED: 'resume_created',
  RESUME_UPDATED: 'resume_created',
  RESUME_SHARED: 'resume_published',
  RESUME_PUBLISHED: 'resume_published',
  THEME_PUBLISHED: 'resume_published',
  ACHIEVEMENT_EARNED: 'section_item_added',
  SKILL_ADDED: 'section_item_added',
  PROFILE_UPDATED: 'resume_created',
  FOLLOWED_USER: 'user_followed',
};

export class CreateActivityUseCase {
  constructor(
    private readonly activityRepository: ActivityRepositoryPort,
    private readonly followRepository: FollowRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    userId: string,
    type: ActivityType,
    metadata?: unknown,
    entityId?: string,
    entityType?: string,
  ): Promise<ActivityWithUser> {
    const activity = await this.activityRepository.createActivity({
      userId,
      type,
      metadata: metadata ?? undefined,
      entityId,
      entityType,
    });

    this.eventPublisher.publish(
      new ActivityCreatedEvent(activity.id, {
        userId,
        activityType: ACTIVITY_TYPE_MAPPING[type],
        targetId: entityId ?? activity.id,
      }),
    );

    // Fetch the activity with user info for SSE
    const activityWithUser = await this.activityRepository.findActivityWithUser(activity.id);

    // Get followers and emit to their feeds
    const followerIds = await this.followRepository.findFollowerIds(userId);
    for (const followerId of followerIds) {
      this.eventEmitter.emit(`feed:user:${followerId}`, activityWithUser);
    }

    return activity;
  }
}
