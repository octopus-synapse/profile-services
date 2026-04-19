import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisherPort } from '@/shared-kernel/event-bus/event-publisher';
import { FollowRepository } from '../infrastructure/adapters/persistence/follow.repository';
import { FOLLOW_USE_CASES, type FollowUseCases } from './ports/follow.port';
import { CheckFollowingUseCase } from './use-cases/check-following/check-following.use-case';
import { FollowUserUseCase } from './use-cases/follow-user/follow-user.use-case';
import { GetFollowersUseCase } from './use-cases/get-followers/get-followers.use-case';
import { GetFollowingUseCase } from './use-cases/get-following/get-following.use-case';
import { GetFollowingIdsUseCase } from './use-cases/get-following-ids/get-following-ids.use-case';
import { GetSocialStatsUseCase } from './use-cases/get-social-stats/get-social-stats.use-case';
import { UnfollowUserUseCase } from './use-cases/unfollow-user/unfollow-user.use-case';

export { FOLLOW_USE_CASES };

export function buildFollowUseCases(
  prisma: PrismaService,
  eventPublisher: EventPublisherPort,
): FollowUseCases {
  const repository = new FollowRepository(prisma);

  return {
    followUserUseCase: new FollowUserUseCase(repository, eventPublisher),
    unfollowUserUseCase: new UnfollowUserUseCase(repository),
    checkFollowingUseCase: new CheckFollowingUseCase(repository),
    getFollowersUseCase: new GetFollowersUseCase(repository),
    getFollowingUseCase: new GetFollowingUseCase(repository),
    getSocialStatsUseCase: new GetSocialStatsUseCase(repository),
    getFollowingIdsUseCase: new GetFollowingIdsUseCase(repository),
  };
}
