/**
 * Activity Feed SSE Controller
 *
 * Provides Server-Sent Events (SSE) for real-time activity feed updates.
 * Replaces HTTP polling with push-based updates.
 *
 * Martin Fowler: "Push beats polling for real-time data."
 */

import {
  Controller,
  Sse,
  UseGuards,
  MessageEvent,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map, filter } from 'rxjs';
import type { ActivityType } from '@prisma/client';

interface ActivityFeedEvent {
  id: string;
  userId: string;
  type: ActivityType;
  metadata: unknown;
  entityId: string | null;
  entityType: string | null;
  createdAt: Date;
  user?: {
    id: string;
    name: string | null;
    username: string | null;
    photoURL: string | null;
  };
}

@Controller('v1/feed')
export class ActivityFeedSseController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Subscribe to activity feed updates via SSE.
   * Emits new activities from followed users in real-time.
   *
   * Usage:
   * ```typescript
   * const eventSource = new EventSource('/v1/feed/subscribe', {
   *   headers: { Authorization: 'Bearer token' }
   * });
   * eventSource.onmessage = (event) => {
   *   const activity = JSON.parse(event.data);
   *   console.log('New activity:', activity);
   * };
   * ```
   */
  @Sse('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribeToFeed(@CurrentUser() user: UserPayload): Observable<MessageEvent> {
    // Listen to activity events for this user's feed
    return fromEvent<ActivityFeedEvent>(
      this.eventEmitter,
      `feed:user:${user.userId}`,
    ).pipe(
      filter((activity): activity is ActivityFeedEvent => Boolean(activity)),
      map((activity) => ({
        data: activity,
        id: activity.id,
        type: 'activity',
        retry: 10000, // Retry after 10s if connection drops
      })),
    );
  }

  /**
   * Subscribe to specific activity types via SSE.
   * Allows filtering to specific activity types (e.g., only RESUME_CREATED).
   */
  @Sse('subscribe/:type')
  @UseGuards(JwtAuthGuard)
  subscribeToActivityType(
    @CurrentUser() user: UserPayload,
    @Param('type') type: ActivityType,
  ): Observable<MessageEvent> {
    return fromEvent<ActivityFeedEvent>(
      this.eventEmitter,
      `feed:user:${user.userId}`,
    ).pipe(
      filter((activity) => activity.type === type),
      map((activity) => ({
        data: activity,
        id: activity.id,
        type: 'activity',
        retry: 10000,
      })),
    );
  }
}
