import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { UsernameRepositoryPort } from '../../../application/ports/username.port';

export class UsernameRepository extends UsernameRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findUserById(userId: string): Promise<{ id: string; username: string | null } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });
  }

  async updateUsername(userId: string, username: string): Promise<{ username: string }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { username, usernameUpdatedAt: new Date() },
      select: { username: true },
    });

    return { username: user.username ?? '' };
  }

  async findLastUsernameUpdateByUserId(userId: string): Promise<Date | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { usernameUpdatedAt: true },
    });

    return user?.usernameUpdatedAt ?? null;
  }

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    // Two-table check, mirroring `OnboardingProgressRepository.findUserByUsername`:
    // a name is "taken" if some other user has either (a) committed it to
    // `User.username` OR (b) staged it on their `OnboardingProgress.username`
    // claim. Without the progress branch, `/v1/users/username/check` would say
    // "available" for a name another user is mid-onboarding with, and then
    // `/v1/onboarding/session/next` (which DOES walk both tables in
    // `SaveProgressUseCase`) would reject the advance with a USERNAME_TAKEN
    // 409 — the exact UI inconsistency we hit during dogfooding.
    //
    // Case-insensitive lookup: `User.username` is stored lowercased by
    // `UsernameSchema`, but treating "ENZO" and "enzo" as the same handle
    // belt-and-suspenders against legacy rows or any future writer that
    // bypasses the schema.
    const [committedUser, claimingProgress] = await Promise.all([
      this.prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: { id: true },
      }),
      this.prisma.onboardingProgress.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: { userId: true },
      }),
    ]);

    if (committedUser && committedUser.id !== excludeUserId) return true;
    if (claimingProgress && claimingProgress.userId !== excludeUserId) return true;
    return false;
  }
}
