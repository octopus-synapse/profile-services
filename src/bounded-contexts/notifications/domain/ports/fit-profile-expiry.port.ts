/**
 * Outbound port for the read side of the fit-profile expiry-reminder
 * worker. Returns the rows due for a given window so the use case can
 * fan out one reminder per user.
 *
 * Lives in `notifications/domain/ports` because the *consumer* (the
 * reminder use case) lives here. The Prisma adapter reads from
 * `UserFitProfile` directly — same table the fit-profile BC owns — but
 * stays inside this BC's infrastructure layer.
 */

import type { FitProfileExpiringRow } from '../entities/notification.entity';

export abstract class FitProfileExpiryReadPort {
  abstract findExpiringInWindow(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<FitProfileExpiringRow[]>;
}
