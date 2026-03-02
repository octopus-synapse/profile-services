/**
 * Analytics Projection Seed
 *
 * Populates the analytics_resume_projection table from existing resumes.
 * This materializes the read model for analytics queries.
 *
 * Decision: Run this once after migration to initialize projections.
 * After that, event handlers keep projections in sync.
 */

import type { PrismaClient } from '@prisma/client';

const SECTION_KIND_TO_PROJECTION_FIELD: Record<string, keyof ProjectionCounts> = {
  WORK_EXPERIENCE: 'experiencesCount',
  EDUCATION: 'educationCount',
  SKILL_SET: 'skillsCount',
  CERTIFICATION: 'certificationsCount',
  PROJECT: 'projectsCount',
  AWARD: 'awardsCount',
  LANGUAGE: 'languagesCount',
  INTEREST: 'interestsCount',
  RECOMMENDATION: 'recommendationsCount',
  ACHIEVEMENT: 'achievementsCount',
  PUBLICATION: 'publicationsCount',
  TALK: 'talksCount',
  HACKATHON: 'hackathonsCount',
  BUG_BOUNTY: 'bugBountiesCount',
  OPEN_SOURCE: 'openSourceCount',
};

type ProjectionCounts = {
  experiencesCount: number;
  educationCount: number;
  skillsCount: number;
  certificationsCount: number;
  projectsCount: number;
  awardsCount: number;
  languagesCount: number;
  interestsCount: number;
  recommendationsCount: number;
  achievementsCount: number;
  publicationsCount: number;
  talksCount: number;
  hackathonsCount: number;
  bugBountiesCount: number;
  openSourceCount: number;
};

function createEmptyCounts(): ProjectionCounts {
  return {
    experiencesCount: 0,
    educationCount: 0,
    skillsCount: 0,
    certificationsCount: 0,
    projectsCount: 0,
    awardsCount: 0,
    languagesCount: 0,
    interestsCount: 0,
    recommendationsCount: 0,
    achievementsCount: 0,
    publicationsCount: 0,
    talksCount: 0,
    hackathonsCount: 0,
    bugBountiesCount: 0,
    openSourceCount: 0,
  };
}

function deriveCountsFromSections(
  resumeSections: Array<{
    sectionType: {
      semanticKind: string;
    };
    items: Array<{
      id: string;
    }>;
  }>,
): ProjectionCounts {
  const counts = createEmptyCounts();

  for (const section of resumeSections) {
    const field = SECTION_KIND_TO_PROJECTION_FIELD[section.sectionType.semanticKind];
    if (!field) {
      continue;
    }

    counts[field] += section.items.length;
  }

  return counts;
}

export async function seedAnalyticsProjections(prisma: PrismaClient): Promise<void> {
  console.log('📊 Seeding analytics projections...');

  // Get all resumes with section items + counts for still-existing non-generic models
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
      _count: {
        select: {
          achievements: true,
          publications: true,
          talks: true,
          hackathons: true,
          bugBounties: true,
          openSource: true,
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
    const sectionCounts = deriveCountsFromSections(resume.resumeSections);

    const projectionData = {
      userId: resume.userId,
      title: resume.title,
      ...sectionCounts,
      achievementsCount:
        sectionCounts.achievementsCount > 0
          ? sectionCounts.achievementsCount
          : resume._count.achievements,
      publicationsCount:
        sectionCounts.publicationsCount > 0
          ? sectionCounts.publicationsCount
          : resume._count.publications,
      talksCount: sectionCounts.talksCount > 0 ? sectionCounts.talksCount : resume._count.talks,
      hackathonsCount:
        sectionCounts.hackathonsCount > 0
          ? sectionCounts.hackathonsCount
          : resume._count.hackathons,
      bugBountiesCount:
        sectionCounts.bugBountiesCount > 0
          ? sectionCounts.bugBountiesCount
          : resume._count.bugBounties,
      openSourceCount:
        sectionCounts.openSourceCount > 0
          ? sectionCounts.openSourceCount
          : resume._count.openSource,
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
