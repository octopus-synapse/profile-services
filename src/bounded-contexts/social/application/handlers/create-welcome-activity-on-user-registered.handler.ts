/**
 * Create Welcome Activity on User Registered Handler
 *
 * Cross-context event handler that reacts to UserRegisteredEvent
 * from Identity context to create a welcome activity.
 *
 * Robert C. Martin: "Single Responsibility"
 * - This handler only creates welcome activity when a user registers.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityService } from '../../social/services/activity.service';
import { UserRegisteredEvent } from '@/bounded-contexts/identity/domain/events';

@Injectable()
export class CreateWelcomeActivityOnUserRegisteredHandler {
  private readonly logger = new Logger(
    CreateWelcomeActivityOnUserRegisteredHandler.name,
  );

  constructor(private readonly activityService: ActivityService) {}

  @OnEvent(UserRegisteredEvent.TYPE)
  async handle(event: UserRegisteredEvent): Promise<void> {
    const userId = event.aggregateId;

    this.logger.log(`Creating welcome activity for new user: ${userId}`);

    await this.activityService.createActivity(
      userId,
      'PROFILE_UPDATED',
      { action: 'user_registered', username: event.payload.username },
      userId,
      'user',
    );

    this.logger.log(
      `Welcome activity created for user ${userId} (${event.payload.username})`,
    );
  }
}
