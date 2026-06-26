import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SEMANTIC_KIND } from '@/shared-kernel/schemas/sections/semantic-kind.const';
import { ResumeLoaderPort } from '../../../domain/ports/resume-loader.port';
import type { ResumeBullet, ResumeForCompleteness } from '../../../domain/rules/completeness.rules';

/** Section kinds whose item content carries free-text the Content Quality
 * AI should grade (action verbs / metrics / XYZ-STAR / specificity). */
const BULLET_KINDS = new Set<string>([
  SEMANTIC_KIND.WORK_EXPERIENCE,
  SEMANTIC_KIND.SUMMARY,
  SEMANTIC_KIND.PROJECT,
  SEMANTIC_KIND.VOLUNTEER,
]);

/**
 * Prisma-backed ResumeLoader. Projects the generic section graph
 * (`ResumeSection` → `SectionItem.content` JSON) into the typed shape the
 * quality engine needs: `experiences`/`educations`/`skills` for the
 * deterministic completeness rules and `bullets` (real text) for the AI
 * Content Quality call. Section content keys come from the seed
 * (`prisma/seeds/shared/section-type.seed.ts`): WORK_EXPERIENCE →
 * company/role/startDate/endDate/description/achievements[]; EDUCATION →
 * institution/startDate/endDate; SKILL_SET → name; SUMMARY → text;
 * PROJECT → name/description/highlights[].
 *
 * Framework-free POJO. Wired by `resume-quality.composition.ts`.
 */
export class PrismaResumeLoader extends ResumeLoaderPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async load(resumeId: string): Promise<ResumeForCompleteness | null> {
    const row = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: {
        fullName: true,
        summary: true,
        jobTitle: true,
        phone: true,
        language: true,
        resumeSections: {
          select: {
            sectionType: { select: { semanticKind: true } },
            items: { orderBy: { order: 'asc' }, select: { content: true } },
          },
        },
      },
    });
    if (!row) return null;

    const sections = row.resumeSections.map((rs) => ({
      semanticKind: rs.sectionType.semanticKind,
      items: rs.items.map((item) => ({
        content: (item.content as Record<string, unknown>) ?? {},
      })),
    }));

    const experiences: NonNullable<ResumeForCompleteness['experiences'][number]>[] = [];
    const educations: ResumeForCompleteness['educations'][number][] = [];
    const skills: ResumeForCompleteness['skills'][number][] = [];
    const bullets: ResumeBullet[] = [];

    for (const section of sections) {
      const { semanticKind, items } = section;
      items.forEach((item, itemIndex) => {
        const c = item.content;
        switch (semanticKind) {
          case SEMANTIC_KIND.WORK_EXPERIENCE:
            experiences.push({
              role: asString(c.role),
              company: asString(c.company),
              startedAt: parseDate(c.startDate),
              endedAt: parseDate(c.endDate),
            });
            break;
          case SEMANTIC_KIND.EDUCATION:
            educations.push({
              institution: asString(c.institution),
              startedAt: parseDate(c.startDate),
              endedAt: parseDate(c.endDate),
            });
            break;
          case SEMANTIC_KIND.SKILL_SET: {
            const name = asString(c.name);
            if (name) skills.push({ name });
            break;
          }
          default:
            break;
        }

        if (BULLET_KINDS.has(semanticKind)) {
          for (const [field, text] of collectBulletText(c)) {
            bullets.push({
              id: `${semanticKind.toLowerCase()}:${itemIndex}:${field}`,
              text,
              sectionKind: semanticKind,
            });
          }
        }
      });
    }

    return {
      fullName: row.fullName,
      summary: row.summary,
      jobTitle: row.jobTitle,
      phone: row.phone,
      language: row.language,
      experiences,
      educations,
      skills,
      bullets,
      sections,
    };
  }
}

/** Pull gradeable free-text out of a section item: the prose `description`
 * / `text` fields plus every entry in the `achievements`/`highlights`
 * string arrays. Returns `[fieldKey, text]` pairs so bullets keep a stable
 * id back to their origin field. */
function collectBulletText(content: Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const key of ['description', 'text']) {
    const value = asString(content[key]);
    if (value) out.push([key, value]);
  }
  for (const key of ['achievements', 'highlights']) {
    const arr = content[key];
    if (Array.isArray(arr)) {
      arr.forEach((entry, i) => {
        const value = asString(entry);
        if (value) out.push([`${key}[${i}]`, value]);
      });
    }
  }
  return out;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/** Section dates are stored as `YYYY-MM-01` strings (the dependency-free
 * month/year picker). Parse defensively; an unparseable value is treated
 * as "no date" rather than throwing. */
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
