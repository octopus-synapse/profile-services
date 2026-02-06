/**
 * E2E Test Cleanup Helper
 *
 * Handles cleanup of test data after E2E tests.
 * Ensures test isolation and prevents data pollution.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export class CleanupHelper {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Delete user and all related data by email
   */
  async deleteUserByEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return; // User doesn't exist, nothing to clean
    }

    await this.deleteUserById(user.id);
  }

  /**
   * Delete user and all related data by ID
   */
  async deleteUserById(userId: string): Promise<void> {
    // Prisma cascade deletes should handle most relations
    // But we'll be explicit for critical data

    try {
      // Delete in correct order to respect foreign keys
      await this.prisma.userConsent.deleteMany({ where: { userId } });
      await this.prisma.onboardingProgress.deleteMany({ where: { userId } });

      // Delete resumes (cascades to sub-resources)
      const resumes = await this.prisma.resume.findMany({
        where: { userId },
        select: { id: true },
      });

      for (const resume of resumes) {
        await this.deleteResumeById(resume.id);
      }

      // Delete user
      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      // User might already be deleted by cascade
      console.warn(`Cleanup warning for user ${userId}:`, error);
    }
  }

  /**
   * Delete resume and all related data
   */
  async deleteResumeById(resumeId: string): Promise<void> {
    try {
      // Delete shares
      await this.prisma.resumeShare.deleteMany({ where: { resumeId } });

      // Delete analytics
      await this.prisma.resumeAnalytics.deleteMany({ where: { resumeId } });
      await this.prisma.analyticsResumeProjection.deleteMany({
        where: { id: resumeId },
      });

      // Delete sub-resources (if not cascaded)
      await this.prisma.skill.deleteMany({ where: { resumeId } });
      await this.prisma.experience.deleteMany({ where: { resumeId } });
      await this.prisma.education.deleteMany({ where: { resumeId } });
      await this.prisma.language.deleteMany({ where: { resumeId } });
      await this.prisma.certification.deleteMany({ where: { resumeId } });
      await this.prisma.project.deleteMany({ where: { resumeId } });
      await this.prisma.award.deleteMany({ where: { resumeId } });
      await this.prisma.publication.deleteMany({ where: { resumeId } });
      await this.prisma.talk.deleteMany({ where: { resumeId } });
      await this.prisma.hackathon.deleteMany({ where: { resumeId } });
      await this.prisma.bugBounty.deleteMany({ where: { resumeId } });
      await this.prisma.openSource.deleteMany({ where: { resumeId } });
      await this.prisma.achievement.deleteMany({ where: { resumeId } });
      await this.prisma.interest.deleteMany({ where: { resumeId } });
      await this.prisma.recommendation.deleteMany({ where: { resumeId } });

      // Delete resume
      await this.prisma.resume.delete({ where: { id: resumeId } });
    } catch (error) {
      console.warn(`Cleanup warning for resume ${resumeId}:`, error);
    }
  }

  /**
   * Clean all test data (use sparingly!)
   */
  async cleanAllE2EData(): Promise<void> {
    // Delete all users with e2e-test email pattern
    const testUsers = await this.prisma.user.findMany({
      where: {
        email: {
          contains: 'e2e-test',
        },
      },
      select: { id: true },
    });

    for (const user of testUsers) {
      await this.deleteUserById(user.id);
    }
  }

  /**
   * Delete share by slug
   */
  async deleteShareBySlug(slug: string): Promise<void> {
    try {
      await this.prisma.resumeShare.delete({ where: { slug } });
    } catch (error) {
      console.warn(`Cleanup warning for share ${slug}:`, error);
    }
  }
}
