import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import type { SseStreamPort } from '@/shared-kernel/http/sse-stream.port';
import { ActivityRepository } from '../infrastructure/adapters/persistence/activity.repository';
import { FollowRepository } from '../infrastructure/adapters/persistence/follow.repository';
import { ActivityUseCases } from './ports/activity.port';
import { CreateActivityUseCase } from './use-cases/create-activity/create-activity.use-case';
import { GetActivitiesByTypeUseCase } from './use-cases/get-activities-by-type/get-activities-by-type.use-case';
import { GetFeedUseCase } from './use-cases/get-feed/get-feed.use-case';
import { GetUserActivitiesUseCase } from './use-cases/get-user-activities/get-user-activities.use-case';
import { PurgeOldActivitiesUseCase } from './use-cases/purge-old-activities/purge-old-activities.use-case';

export { ActivityUseCases };

export function buildActivityUseCases(
  prisma: PrismaService,
  eventPublisher: EventPublisherPort,
  sse: SseStreamPort,
  logger: LoggerPort,
): ActivityUseCases {
  const activityRepository = new ActivityRepository(prisma);
  const followRepository = new FollowRepository(prisma);

  return {
    createActivityUseCase: new CreateActivityUseCase(
      activityRepository,
      followRepository,
      eventPublisher,
      sse,
      logger,
    ),
    getFeedUseCase: new GetFeedUseCase(activityRepository, followRepository, logger),
    getUserActivitiesUseCase: new GetUserActivitiesUseCase(activityRepository),
    getActivitiesByTypeUseCase: new GetActivitiesByTypeUseCase(activityRepository),
    purgeOldActivitiesUseCase: new PurgeOldActivitiesUseCase(activityRepository),
  };
}
