/**
 * Create Welcome Activity on User Registered Handler
 *
 * Cross-context event handler that reacts to UserRegisteredEvent
 * from Identity context to create a welcome activity.
 *
 * Robert C. Martin: "Single Responsibility"
 * - This handler only creates welcome activity when a user registers.
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRegisteredEvent } from '@/bounded-contexts/identity/shared-kernel/domain/events';
import {
  ACTIVITY_USE_CASES,
  type ActivityUseCases,
} from '../../../social/application/ports/activity.port';

@Injectable()
export class CreateWelcomeActivityOnUserRegisteredHandler {
  private readonly logger = new Logger(CreateWelcomeActivityOnUserRegisteredHandler.name);

  constructor(
    @Inject(ACTIVITY_USE_CASES)
    private readonly activityUseCases: ActivityUseCases,
  ) {}

  @OnEvent(UserRegisteredEvent.TYPE)
  async handle(event: UserRegisteredEvent): Promise<void> {
    const userId = event.aggregateId;

    this.logger.log(`Creating welcome activity for new user: ${userId}`);

    await this.activityUseCases.createActivityUseCase.execute(
      userId,
      'PROFILE_UPDATED',
      { action: 'user_registered', username: event.payload.username },
      userId,
      'user',
    );

    this.logger.log(`Welcome activity created for user ${userId} (${event.payload.username})`);
  }
}
