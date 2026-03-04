import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  OnboardingProgressData,
  ProgressRecord,
  SectionProgressData,
  TransactionClient,
} from '../ports/onboarding-progress.port';
import { OnboardingProgressRepositoryPort } from '../ports/onboarding-progress.port';

type InputJsonValue = Prisma.InputJsonValue;

/**
 * ADAPTER: Maps between legacy DB schema and generic sections domain model.
 *
 * The database still has legacy columns (experiences, education, skills, languages).
 * This adapter converts to/from the generic sections format used by the domain layer.
 * TODO: Create migration to add sections JSON column and migrate data.
 */

export class OnboardingProgressRepository extends OnboardingProgressRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findProgressByUserId(userId: string): Promise<ProgressRecord | null> {
    const record = await this.prisma.onboardingProgress.findUnique({
      where: { userId },
    });

    if (!record) return null;

    // Convert legacy DB format to generic sections format
    const sections: SectionProgressData[] = [];

    if (record.experiences || record.noExperience) {
      sections.push({
        sectionTypeKey: 'work_experience_v1',
        items: record.experiences as unknown[] | undefined,
        noData: record.noExperience,
      });
    }

    if (record.education || record.noEducation) {
      sections.push({
        sectionTypeKey: 'education_v1',
        items: record.education as unknown[] | undefined,
        noData: record.noEducation,
      });
    }

    if (record.skills || record.noSkills) {
      sections.push({
        sectionTypeKey: 'skill_set_v1',
        items: record.skills as unknown[] | undefined,
        noData: record.noSkills,
      });
    }

    if (record.languages) {
      sections.push({
        sectionTypeKey: 'language_v1',
        items: record.languages as unknown[] | undefined,
      });
    }

    return {
      userId: record.userId,
      currentStep: record.currentStep,
      completedSteps: record.completedSteps,
      username: record.username,
      personalInfo: record.personalInfo,
      professionalProfile: record.professionalProfile,
      sections,
      templateSelection: record.templateSelection,
      updatedAt: record.updatedAt,
    };
  }

  async upsertProgress(
    userId: string,
    data: OnboardingProgressData,
  ): Promise<{ currentStep: string; completedSteps: string[] }> {
    // Convert generic sections format back to legacy DB columns
    const legacyData = this.sectionsToLegacyFormat(data.sections ?? []);

    const progressData = {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      username: data.username ?? undefined,
      personalInfo: data.personalInfo as InputJsonValue | undefined,
      professionalProfile: data.professionalProfile as InputJsonValue | undefined,
      experiences: legacyData.experiences as InputJsonValue | undefined,
      noExperience: legacyData.noExperience ?? false,
      education: legacyData.education as InputJsonValue | undefined,
      noEducation: legacyData.noEducation ?? false,
      skills: legacyData.skills as InputJsonValue | undefined,
      noSkills: legacyData.noSkills ?? false,
      languages: legacyData.languages as InputJsonValue | undefined,
      templateSelection: data.templateSelection as InputJsonValue | undefined,
    };

    const progress = await this.prisma.onboardingProgress.upsert({
      where: { userId },
      update: progressData,
      create: { userId, ...progressData },
    });

    return {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
    };
  }

  /**
   * Converts generic sections array to legacy DB column format.
   */
  private sectionsToLegacyFormat(sections: SectionProgressData[]): {
    experiences?: unknown[];
    noExperience?: boolean;
    education?: unknown[];
    noEducation?: boolean;
    skills?: unknown[];
    noSkills?: boolean;
    languages?: unknown[];
  } {
    const result: ReturnType<typeof this.sectionsToLegacyFormat> = {};

    for (const section of sections) {
      switch (section.sectionTypeKey) {
        case 'work_experience_v1':
          result.experiences = section.items;
          result.noExperience = section.noData;
          break;
        case 'education_v1':
          result.education = section.items;
          result.noEducation = section.noData;
          break;
        case 'skill_set_v1':
          result.skills = section.items;
          result.noSkills = section.noData;
          break;
        case 'language_v1':
          result.languages = section.items;
          break;
      }
    }

    return result;
  }

  async deleteProgress(userId: string): Promise<void> {
    await this.prisma.onboardingProgress.deleteMany({ where: { userId } });
  }

  async deleteProgressWithTx(
    tx: TransactionClient,
    userId: string,
  ): Promise<void> {
    const prismaTx = tx as Prisma.TransactionClient;
    await prismaTx.onboardingProgress.deleteMany({ where: { userId } });
  }

  async findUserByUsername(username: string): Promise<{ id: string } | null> {
    return this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
  }
}
