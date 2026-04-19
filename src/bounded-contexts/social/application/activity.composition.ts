import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { ActivityRepository } from '../infrastructure/adapters/persistence/activity.repository';
import { FollowRepository } from '../infrastructure/adapters/persistence/follow.repository';
import { ACTIVITY_USE_CASES, type ActivityUseCases } from './ports/activity.port';
import { CreateActivityUseCase } from './use-cases/create-activity/create-activity.use-case';
import { GetActivitiesByTypeUseCase } from './use-cases/get-activities-by-type/get-activities-by-type.use-case';
import { GetFeedUseCase } from './use-cases/get-feed/get-feed.use-case';
import { GetUserActivitiesUseCase } from './use-cases/get-user-activities/get-user-activities.use-case';
import { PurgeOldActivitiesUseCase } from './use-cases/purge-old-activities/purge-old-activities.use-case';

export { ACTIVITY_USE_CASES };

export function buildActivityUseCases(
  prisma: PrismaService,
  eventPublisher: EventPublisherPort,
  eventEmitter: EventEmitter2,
): ActivityUseCases {
  const activityRepository = new ActivityRepository(prisma);
  const followRepository = new FollowRepository(prisma);

  return {
    createActivityUseCase: new CreateActivityUseCase(
      activityRepository,
      followRepository,
      eventPublisher,
      eventEmitter,
    ),
    getFeedUseCase: new GetFeedUseCase(activityRepository, followRepository),
    getUserActivitiesUseCase: new GetUserActivitiesUseCase(activityRepository),
    getActivitiesByTypeUseCase: new GetActivitiesByTypeUseCase(activityRepository),
    purgeOldActivitiesUseCase: new PurgeOldActivitiesUseCase(activityRepository),
  };
}
