/**
 * Thin wrapper around `FeedTimelineService` so the controller depends
 * on a use-case-shaped object rather than a service.
 */

import type { FeedQuery, FeedTimelineResult } from '../../../domain/entities';
import { FeedTimelineService } from '../../services/feed-timeline.service';

export class ListFeedTimelineUseCase {
  constructor(private readonly timeline: FeedTimelineService) {}

  execute(query: FeedQuery): Promise<FeedTimelineResult> {
    return this.timeline.getTimeline(query);
  }
}
