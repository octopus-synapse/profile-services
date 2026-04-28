import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { type UserFitState, UserFitStatePort } from '../../../domain/ports/user-fit-state.port';

/**
 * Reads the minimum state job-match needs about a user's fit profile:
 * "never answered", "answered and still valid", or "expired". The full
 * profile read lives in `fit-profile/` — we only care about the gate
 * status here, so the coupling stays loose.
 *
 * Prisma-direct for now; when we want to cache this we'll swap the
 * adapter without touching the port. `expiresAt` is the UserFitProfile
 * column committed in the scoring-refactor schema.
 */
export class PrismaUserFitStateAdapter extends UserFitStatePort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async getStatus(userId: string): Promise<UserFitState> {
    const row = await this.prisma.userFitProfile.findUnique({
      where: { userId },
      select: { expiresAt: true },
    });
    if (!row) return { userId, status: 'never' };
    const status: UserFitState['status'] =
      row.expiresAt.getTime() > Date.now() ? 'responded' : 'expired';
    return { userId, status };
  }
}
