import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  LoginAttemptRecord,
  LoginAttemptsPort,
  LoginLockStatus,
} from '../../domain/ports/login-attempts.port';

@Injectable()
export class PrismaLoginAttemptsAdapter implements LoginAttemptsPort {
  private readonly maxFailedAttempts: number;
  private readonly lockDurationMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.maxFailedAttempts = Number(this.config.get<number>('LOGIN_MAX_FAILED_ATTEMPTS') ?? 5);
    const lockMinutes = Number(this.config.get<number>('LOGIN_LOCK_DURATION_MINUTES') ?? 15);
    this.lockDurationMs = lockMinutes * 60_000;
  }

  async record(attempt: LoginAttemptRecord): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        userId: attempt.userId ?? undefined,
        email: attempt.email,
        success: attempt.success,
        ipAddress: attempt.ipAddress,
        userAgent: attempt.userAgent,
        failureCode: attempt.failureCode,
      },
    });
  }

  async getLockStatus(email: string): Promise<LoginLockStatus> {
    const windowStart = new Date(Date.now() - this.lockDurationMs);
    const recent = await this.prisma.loginAttempt.findMany({
      where: { email, createdAt: { gte: windowStart } },
      orderBy: { createdAt: 'desc' },
      select: { success: true, createdAt: true },
    });

    // Count consecutive failures since the last successful login in this window.
    let failureCount = 0;
    for (const row of recent) {
      if (row.success) break;
      failureCount += 1;
    }

    if (failureCount < this.maxFailedAttempts) {
      return { locked: false, failureCount, lockUntil: null, resetInSeconds: null };
    }

    const oldestFailure = recent[failureCount - 1]?.createdAt ?? new Date();
    const lockUntil = new Date(oldestFailure.getTime() + this.lockDurationMs);
    const resetInSeconds = Math.max(0, Math.ceil((lockUntil.getTime() - Date.now()) / 1000));

    return {
      locked: resetInSeconds > 0,
      failureCount,
      lockUntil,
      resetInSeconds,
    };
  }

  async clearFailedAttempts(email: string): Promise<void> {
    await this.prisma.loginAttempt.deleteMany({
      where: { email, success: false },
    });
  }
}
