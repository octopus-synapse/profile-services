import type { ScoringLlmPort } from '@/bounded-contexts/ai/domain/ports/scoring-llm.port';
import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { RoleSkillsPort } from '../../domain/ports/role-skills.port';

const CTX = 'RoleSkillsAdapter';
/** Role skills change slowly — cache a week. */
const TTL_SECONDS = 7 * 24 * 60 * 60;
/** Below this many aggregated skills we consider internal postings too
 * sparse and fall back to the LLM. */
const MIN_AGGREGATED = 5;
const TAKE_JOBS = 200;
const MAX_SKILLS = 15;

/**
 * Resolves the in-demand skills for a role, preferring real signal:
 *   1. aggregate `Job.skills[]` across internal postings whose title matches
 *      the role (frequency-ranked) — deterministic, no cost;
 *   2. if too sparse, ask the LLM (`ScoringLlmPort.generateRoleSkills`).
 * Cached in Redis by normalized label + language so a role is resolved once.
 */
export class RoleSkillsAdapter extends RoleSkillsPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: ScoringLlmPort,
    private readonly cache: CacheService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async getInDemandSkills(roleLabel: string, language?: string | null): Promise<readonly string[]> {
    const label = roleLabel.trim();
    if (!label) return [];
    const lang = language === 'pt-br' ? 'pt-br' : 'en';
    const key = `role-skills:v1:${lang}:${label.toLowerCase()}`;
    try {
      return await this.cache.getOrSet<readonly string[]>(
        key,
        () => this.resolve(label, lang),
        TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `role-skills cache/resolve failed for "${label}": ${(err as Error).message}`,
        CTX,
      );
      return [];
    }
  }

  private async resolve(label: string, lang: string): Promise<readonly string[]> {
    const aggregated = await this.aggregateFromJobs(label);
    if (aggregated.length >= MIN_AGGREGATED) return aggregated;
    try {
      const { skills } = await this.llm.generateRoleSkills({ roleLabel: label, language: lang });
      return skills.length > 0 ? skills : aggregated;
    } catch (err) {
      this.logger.warn(
        `role-skills LLM fallback failed for "${label}": ${(err as Error).message}`,
        CTX,
      );
      return aggregated;
    }
  }

  /** Frequency-ranked skills from internal jobs whose title matches the role. */
  private async aggregateFromJobs(label: string): Promise<string[]> {
    const rows = await this.prisma.job.findMany({
      where: { title: { contains: label, mode: 'insensitive' } },
      select: { skills: true },
      take: TAKE_JOBS,
    });
    const freq = new Map<string, { display: string; count: number }>();
    for (const row of rows) {
      for (const raw of row.skills) {
        const display = raw.trim();
        if (!display) continue;
        const k = display.toLowerCase();
        const entry = freq.get(k);
        if (entry) entry.count++;
        else freq.set(k, { display, count: 1 });
      }
    }
    return [...freq.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_SKILLS)
      .map((e) => e.display);
  }
}
