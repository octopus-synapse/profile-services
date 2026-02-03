/**
 * Analytics SSE Controller
 *
 * Provides Server-Sent Events (SSE) for real-time analytics updates.
 * Pushes view counts and ATS score updates without polling.
 *
 * Kent Beck: "Make the change easy, then make the easy change."
 */

import {
  Controller,
  Sse,
  UseGuards,
  Param,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { JwtAuthGuard } from '@/bounded-contexts/identity/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/bounded-contexts/platform/common/decorators/current-user.decorator';
import type { UserPayload } from '@/bounded-contexts/identity/auth/interfaces/auth-request.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map, merge } from 'rxjs';

interface AnalyticsUpdateEvent {
  type: 'view' | 'ats_score';
  resumeId: string;
  data: {
    views?: number;
    atsScore?: number;
    timestamp: Date;
  };
}

@Controller('v1/analytics')
export class AnalyticsSseController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Subscribe to live analytics updates for a specific resume.
   * Emits view counts and ATS score changes in real-time.
   *
   * Usage:
   * ```typescript
   * const eventSource = new EventSource('/v1/analytics/resume-123/live', {
   *   headers: { Authorization: 'Bearer token' }
   * });
   * eventSource.addEventListener('view', (event) => {
   *   const data = JSON.parse(event.data);
   *   console.log('New view count:', data.views);
   * });
   * eventSource.addEventListener('ats_score', (event) => {
   *   const data = JSON.parse(event.data);
   *   console.log('New ATS score:', data.atsScore);
   * });
   * ```
   */
  @Sse(':resumeId/live')
  @UseGuards(JwtAuthGuard)
  subscribeToResumeAnalytics(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
  ): Observable<MessageEvent<AnalyticsUpdateEvent>> {
    // Listen to both view and ATS score events
    const viewEvents = fromEvent<AnalyticsUpdateEvent>(
      this.eventEmitter,
      `analytics:${resumeId}:view`,
    );

    const atsScoreEvents = fromEvent<AnalyticsUpdateEvent>(
      this.eventEmitter,
      `analytics:${resumeId}:ats_score`,
    );

    // Merge both event streams
    return merge(viewEvents, atsScoreEvents).pipe(
      map((event) => ({
        data: event,
        id: `${resumeId}-${Date.now()}`,
        type: event.type,
        retry: 10000,
      })),
    );
  }

  /**
   * Subscribe to view count updates only.
   */
  @Sse(':resumeId/views')
  @UseGuards(JwtAuthGuard)
  subscribeToViews(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
  ): Observable<MessageEvent<AnalyticsUpdateEvent>> {
    return fromEvent<AnalyticsUpdateEvent>(
      this.eventEmitter,
      `analytics:${resumeId}:view`,
    ).pipe(
      map((event) => ({
        data: event,
        id: `${resumeId}-view-${Date.now()}`,
        type: 'view',
        retry: 10000,
      })),
    );
  }

  /**
   * Subscribe to ATS score updates only.
   */
  @Sse(':resumeId/ats-score')
  @UseGuards(JwtAuthGuard)
  subscribeToAtsScore(
    @CurrentUser() user: UserPayload,
    @Param('resumeId') resumeId: string,
  ): Observable<MessageEvent<AnalyticsUpdateEvent>> {
    return fromEvent<AnalyticsUpdateEvent>(
      this.eventEmitter,
      `analytics:${resumeId}:ats_score`,
    ).pipe(
      map((event) => ({
        data: event,
        id: `${resumeId}-ats-${Date.now()}`,
        type: 'ats_score',
        retry: 10000,
      })),
    );
  }
}
