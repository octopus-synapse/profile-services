/**
 * Outbound port for the data the weekly digest cares about. Lives
 * outside the main repository because it spans tables owned by other
 * bounded contexts (resume views, follows, endorsements, share
 * analytics) — keeping it as its own port prevents the notifications
 * repository from growing unrelated reads.
 */

import type { WeeklyDigestStats } from '../entities/notification';

export abstract class WeeklyDigestStatsPort {
  abstract collect(userId: string, since: Date): Promise<WeeklyDigestStats>;
}
