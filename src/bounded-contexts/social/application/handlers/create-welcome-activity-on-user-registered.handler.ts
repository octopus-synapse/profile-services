/**
 * Create Welcome Activity on User Registered Handler
 *
 * Cross-context event handler that reacts to UserRegisteredEvent
 * from Identity context to create a welcome activity.
 *
 * Robert C. Martin: "Single Responsibility"
 * - This handler only creates welcome activity when a user registers.
 */

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRegisteredEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events';
import { IdempotencyService } from '@/bounded-contexts/platform/common/idempotency/idempotency.service';
import { LoggerPort } from '@/shared-kernel';
import { ActivityService } from '../../services/activity.service';

const CTX = 'CreateWelcomeActivityOnUserRegisteredHandler';

@Injectable()
export class CreateWelcomeActivityOnUserRegisteredHandler {
  constructor(
    private readonly activityService: ActivityService,
    private readonly idempotency: IdempotencyService,
    private readonly logger: LoggerPort,
  ) {}

  @OnEvent(UserRegisteredEvent.TYPE)
  async handle(event: UserRegisteredEvent): Promise<void> {
    const userId = event.aggregateId;

    await this.idempotency.once(`activity:welcome:${userId}`, async () => {
      this.logger.log(`Creating welcome activity for new user: ${userId}`, CTX);
      await this.activityService.createActivity(
        userId,
        'PROFILE_UPDATED',
        { action: 'user_registered', username: event.payload.username },
        userId,
        'user',
      );
      this.logger.log(
        `Welcome activity created for user ${userId} (${event.payload.username})`,
        CTX,
      );
    });
  }
}
