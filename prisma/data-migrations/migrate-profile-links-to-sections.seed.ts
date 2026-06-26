import { type Prisma, PrismaClient } from '@prisma/client';
import { createPrismaClientOptions } from '../../src/bounded-contexts/platform/prisma/prisma-client-options';

/**
 * One-shot, idempotent backfill: move the legacy `User.linkedin/github/website/
 * portfolio` columns into `links_v1` section items on each user's MASTER resume
 * (User.primaryResumeId). `bio` is NOT migrated (it stays the canonical summary,
 * read by the export DSL). `twitter` has no column and is dropped by design.
 *
 * Cost scales with the user table, so this is NOT wired into the normal deploy
 * seed — run it once manually (idempotent, safe to re-run):
 *   docker exec profile-backend-dev sh -lc \
 *     'cd /app && bun run prisma/seeds/migrate-profile-links-to-sections.seed.ts'
 */

type LinkKind = 'LINKEDIN' | 'GITHUB' | 'WEBSITE' | 'PORTFOLIO';

const COLUMN_TO_KIND: ReadonlyArray<{
  column: 'linkedin' | 'github' | 'website' | 'portfolio';
  kind: LinkKind;
}> = [
  { column: 'linkedin', kind: 'LINKEDIN' },
  { column: 'github', kind: 'GITHUB' },
  { column: 'website', kind: 'WEBSITE' },
  { column: 'portfolio', kind: 'PORTFOLIO' },
];

/** Strip protocol + `www.`, return the bare host. null on anything unparseable
 *  (mailto:, garbage) — the link still works, it just renders without a logo. */
export function extractDomain(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  // A non-web scheme (mailto:, tel:, …) has no meaningful domain.
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) return null;
  try {
    const host = new URL(hasScheme ? trimmed : `https://${trimmed}`).hostname.toLowerCase();
    if (!host?.includes('.')) return null;
    return host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export async function migrateProfileLinksToSections(prisma: PrismaClient): Promise<void> {
  console.log('🔗 Migrating User link columns → links_v1 section items...');

  const sectionType = await prisma.sectionType.findUnique({
    where: { key: 'links_v1' },
    select: { id: true },
  });
  if (!sectionType) {
    throw new Error(
      '[migrate-links] links_v1 SectionType not found — run the section-type seed first.',
    );
  }

  const users = await prisma.user.findMany({
    where: {
      primaryResumeId: { not: null },
      OR: [
        { linkedin: { not: null } },
        { github: { not: null } },
        { website: { not: null } },
        { portfolio: { not: null } },
      ],
    },
    select: {
      id: true,
      primaryResumeId: true,
      linkedin: true,
      github: true,
      website: true,
      portfolio: true,
    },
  });

  let usersTouched = 0;
  let itemsCreated = 0;

  for (const user of users) {
    const resumeId = user.primaryResumeId;
    if (!resumeId) continue;

    // Upsert the links_v1 ResumeSection on the master resume.
    const section = await prisma.resumeSection.upsert({
      where: { resumeId_sectionTypeId: { resumeId, sectionTypeId: sectionType.id } },
      update: {},
      create: { resumeId, sectionTypeId: sectionType.id },
      select: { id: true },
    });

    // Existing items → dedupe set keyed by `kind|url`, plus the next order.
    const existing = await prisma.sectionItem.findMany({
      where: { resumeSectionId: section.id },
      select: { content: true, order: true },
    });
    const seen = new Set<string>();
    let nextOrder = 0;
    for (const item of existing) {
      const c = item.content as { kind?: string; url?: string } | null;
      if (c?.kind && c?.url) seen.add(`${c.kind}|${c.url.trim()}`);
      if (item.order >= nextOrder) nextOrder = item.order + 1;
    }

    for (const { column, kind } of COLUMN_TO_KIND) {
      const url = user[column]?.trim();
      if (!url) continue;
      const dedupeKey = `${kind}|${url}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const content: Prisma.InputJsonValue = { kind, url, domain: extractDomain(url) };
      await prisma.sectionItem.create({
        data: { resumeSectionId: section.id, order: nextOrder, content },
      });
      nextOrder += 1;
      itemsCreated += 1;
    }

    usersTouched += 1;
  }

  console.log(
    `✅ Link migration done: ${itemsCreated} items created across ${usersTouched} users (of ${users.length} candidates).`,
  );
}

// Standalone runner.
if (import.meta.main) {
  const prisma = new PrismaClient(createPrismaClientOptions());
  migrateProfileLinksToSections(prisma)
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
