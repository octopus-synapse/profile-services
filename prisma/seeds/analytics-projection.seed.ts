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

export async function seedAnalyticsProjections(
  prisma: PrismaClient,
): Promise<void> {
  console.log('📊 Seeding analytics projections...');

  // Get all resumes with _count of each section type
  const resumes = await prisma.resume.findMany({
    select: {
      id: true,
      userId: true,
      title: true,
      _count: {
        select: {
          experiences: true,
          education: true,
          skills: true,
          certifications: true,
          projects: true,
          awards: true,
          languages: true,
          interests: true,
          recommendations: true,
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
    const projectionData = {
      userId: resume.userId,
      title: resume.title,
      experiencesCount: resume._count.experiences,
      educationCount: resume._count.education,
      skillsCount: resume._count.skills,
      certificationsCount: resume._count.certifications,
      projectsCount: resume._count.projects,
      awardsCount: resume._count.awards,
      languagesCount: resume._count.languages,
      interestsCount: resume._count.interests,
      recommendationsCount: resume._count.recommendations,
      achievementsCount: resume._count.achievements,
      publicationsCount: resume._count.publications,
      talksCount: resume._count.talks,
      hackathonsCount: resume._count.hackathons,
      bugBountiesCount: resume._count.bugBounties,
      openSourceCount: resume._count.openSource,
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
