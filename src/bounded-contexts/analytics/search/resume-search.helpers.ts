import { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SearchResultItem } from './resume-search.types';

export function normalizeSearchTerms(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ');
}

/** ORDER BY clause as Prisma.Sql fragment for safe interpolation. */
export function buildOrderClauseSql(sortBy: string): Prisma.Sql {
  switch (sortBy) {
    case 'date':
      return Prisma.sql`"createdAt" DESC`;
    case 'views':
      return Prisma.sql`"profileViews" DESC`;
    default:
      return Prisma.sql`"profileViews" DESC, "createdAt" DESC`;
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function extractSkillNames(
  sections: Array<{ items: Array<{ content: unknown }> }>,
): string[] {
  const skills: string[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      const content = asRecord(item.content);
      if (typeof content.name === 'string') skills.push(content.name.toLowerCase());
    }
  }
  return skills;
}

/** Filter search results by skills (post-query). */
export async function filterResultsBySkills(
  prisma: PrismaService,
  results: SearchResultItem[],
  skills: string[],
): Promise<SearchResultItem[]> {
  if (results.length === 0) return results;

  const resumeIds = results.map((r) => r.id);
  const normalizedSkills = skills.map((s) => s.toLowerCase());

  const items = await prisma.sectionItem.findMany({
    where: {
      resumeSection: {
        resumeId: { in: resumeIds },
        sectionType: { semanticKind: { contains: 'SKILL', mode: 'insensitive' } },
      },
    },
    select: {
      resumeSection: { select: { resumeId: true } },
      content: true,
    },
  });

  const matchingIds = new Set<string>();
  for (const item of items) {
    const content = asRecord(item.content);
    const name = typeof content.name === 'string' ? content.name.toLowerCase() : '';
    if (normalizedSkills.includes(name)) matchingIds.add(item.resumeSection.resumeId);
  }

  return results.filter((r) => matchingIds.has(r.id));
}
