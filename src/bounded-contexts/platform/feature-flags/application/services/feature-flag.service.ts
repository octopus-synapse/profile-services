import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { FlagEvaluationSnapshot } from '../../domain/types';
import { EvaluateFlagsUseCase } from '../use-cases/evaluate-flags.use-case';

/**
 * Public API for other bounded contexts to check feature flags imperatively.
 * Resolves the calling user's roles then delegates to the cached evaluator.
 *
 * Example:
 *   if (await this.flags.isEnabled('resumes.export.pdf', userId)) { ... }
 */
@Injectable()
export class FeatureFlagService {
  constructor(
    private readonly evaluator: EvaluateFlagsUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async isEnabled(key: string, userId: string | null): Promise<boolean> {
    const roles = userId ? await this.rolesFor(userId) : [];
    return this.evaluator.isEnabled(key, roles);
  }

  async snapshotFor(userId: string | null): Promise<FlagEvaluationSnapshot> {
    const roles = userId ? await this.rolesFor(userId) : [];
    return this.evaluator.execute(roles);
  }

  private async rolesFor(userId: string): Promise<string[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { role: { select: { name: true } } },
    });
    return assignments.map((a) => a.role.name);
  }
}
