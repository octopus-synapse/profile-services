/**
 * Analytics Projection Seed
 *
 * Populates the analytics_resume_projection table from existing resumes.
 * This materializes the read model for analytics queries.
 *
 * Decision: Run this once after migration to initialize projections.
 * After that, event handlers keep projections in sync.
 *
 * GENERIC SECTIONS: Uses JSON sectionCounts field instead of individual columns.
 * Keys are semanticKind strings, values are item counts.
 */

import type { PrismaClient } from '@prisma/client';

/**
 * Derives section counts from resume sections.
 * Returns a JSON object with semanticKind as keys and item counts as values.
 */
function deriveSectionCounts(
  resumeSections: Array<{
    sectionType: {
      semanticKind: string;
    };
    items: Array<{
      id: string;
    }>;
  }>,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const section of resumeSections) {
    const kind = section.sectionType.semanticKind;
    counts[kind] = (counts[kind] ?? 0) + section.items.length;
  }

  return counts;
}

export async function seedAnalyticsProjections(
  prisma: PrismaClient,
): Promise<void> {
  console.log('📊 Seeding analytics projections...');

  // Get all resumes with section items
  const resumes = await prisma.resume.findMany({
    select: {
      id: true,
      userId: true,
      title: true,
      resumeSections: {
        select: {
          sectionType: {
            select: {
              semanticKind: true,
            },
          },
          items: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (resumes.length === 0) {
    console.log('  ℹ️  No resumes found, skipping projections');
    return;
  }

  let created = 0;
  let updated = 0;

  for (const resume of resumes) {
    const sectionCounts = deriveSectionCounts(resume.resumeSections);

    const projectionData = {
      userId: resume.userId,
      title: resume.title,
      sectionCounts,
    };

    // Check if projection already exists
    const existing = await prisma.analyticsResumeProjection.findUnique({
      where: { id: resume.id },
    });

    if (existing) {
      await prisma.analyticsResumeProjection.update({
        where: { id: resume.id },
        data: projectionData,
      });
      updated++;
    } else {
      await prisma.analyticsResumeProjection.create({
        data: {
          id: resume.id,
          ...projectionData,
        },
      });
      created++;
    }
  }

  console.log(`  ✅ Analytics projections seeded:`);
  console.log(`     - Created: ${created}`);
  console.log(`     - Updated: ${updated}`);
  console.log(`     - Total resumes: ${resumes.length}`);
}
