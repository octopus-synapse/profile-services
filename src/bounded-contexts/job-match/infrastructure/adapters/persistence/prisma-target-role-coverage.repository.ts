import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { RoleSkillsPort } from '../../../domain/ports/role-skills.port';
import { TargetRoleCoveragePort } from '../../../domain/ports/target-role-coverage.port';
import { scoreOverlapCoverage } from '../../../domain/readiness/blend-readiness.rules';

const CTX = 'PrismaTargetRoleCoverage';

/**
 * Computes market-relative coverage: overlap between the résumé's skills
 * (primaryStack ∪ the user's self-declared UserSkillProficiency) and the
 * in-demand skills of the résumé's `targetRoleLabel`. Returns `null` when
 * there's no target role or its skills can't be resolved — the readiness
 * use-case then falls back to count-based coverage.
 */
export class PrismaTargetRoleCoverage extends TargetRoleCoveragePort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleSkills: RoleSkillsPort,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async computeCoverage(userId: string, resumeId: string): Promise<number | null> {
    try {
      const resume = await this.prisma.resume.findUnique({
        where: { id: resumeId },
        select: { targetRoleLabel: true, primaryStack: true, language: true },
      });
      const roleLabel = resume?.targetRoleLabel?.trim();
      if (!roleLabel) return null;

      const [roleSkills, userSkills] = await Promise.all([
        this.roleSkills.getInDemandSkills(roleLabel, resume?.language ?? null),
        this.prisma.userSkillProficiency.findMany({
          where: { userId },
          select: { skillName: true },
        }),
      ]);
      if (roleSkills.length === 0) return null;

      const resumeSkills = [...(resume?.primaryStack ?? []), ...userSkills.map((s) => s.skillName)];
      return scoreOverlapCoverage(resumeSkills, roleSkills);
    } catch (err) {
      this.logger.warn(
        `target-role coverage failed for resume=${resumeId}: ${(err as Error).message}`,
        CTX,
      );
      return null;
    }
  }
}
