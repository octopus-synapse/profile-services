import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AccountData, AccountLifecycleRepositoryPort, CreateAccountData } from '../../domain/ports';

export class PrismaAccountLifecycleRepository implements AccountLifecycleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<AccountData | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isActive: true, createdAt: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      name: user.name,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt,
    };
  }

  async findByEmail(email: string): Promise<AccountData | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isActive: true, createdAt: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      name: user.name,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt,
    };
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }

  async findPasswordHashById(userId: string): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    return row?.passwordHash ?? null;
  }

  async create(data: CreateAccountData): Promise<AccountData> {
    // New auth model: signup creates the bare user. The `user` role
    // (with all domain permissions) is granted later by the
    // onboarding-complete use case in a single transaction. The legacy
    // `User.roles[]` column stays empty — the gate reads UserRoleAssignment.
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        isActive: true,
        emailVerified: null,
      },
      select: { id: true, email: true, name: true, isActive: true, createdAt: true },
    });

    return {
      id: user.id,
      email: user.email ?? '',
      name: user.name,
      isActive: user.isActive ?? true,
      createdAt: user.createdAt,
    };
  }

  async deactivate(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async reactivate(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  async delete(userId: string): Promise<void> {
    // P0-#25 follow-up: snapshot the user's job applications into the
    // userId-free AnonymizedApplicationStat before cascading them away.
    // The snapshot keeps company-level + per-job aggregates intact for
    // analytics that must survive an LGPD erasure. We do it INSIDE the
    // same transaction so a failure leaves the User row in place (no
    // partial delete that would also lose the snapshot opportunity).
    await this.prisma.$transaction(async (tx) => {
      // 1. Anonymise application history (drops userId, keeps shape).
      await tx.$executeRaw`
        INSERT INTO "AnonymizedApplicationStat" ("id", "jobId", "company", "status", "occurredAt", "createdAt")
        SELECT
          gen_random_uuid()::text,
          ja."jobId",
          j."company",
          ja."status",
          ja."createdAt",
          CURRENT_TIMESTAMP
        FROM "JobApplication" ja
        JOIN "Job" j ON j."id" = ja."jobId"
        WHERE ja."userId" = ${userId}
      `;

      // 2. Manual token sweep (kept from earlier — covers tables whose
      //    cascade was previously the only erasure path).
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.refreshToken.deleteMany({ where: { userId } });

      // 3. Delete user. Newly-added FK constraints cascade JobApplication /
      //    JobBookmark / PollVote and set Job.authorId to NULL.
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
