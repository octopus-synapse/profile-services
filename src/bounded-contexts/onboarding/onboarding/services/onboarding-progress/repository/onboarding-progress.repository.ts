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
type JsonObject = Prisma.JsonObject;

/**
 * Repository for OnboardingProgress using generic sections model.
 * Stores section data in the `sections` JSON column.
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

    return {
      userId: record.userId,
      currentStep: record.currentStep,
      completedSteps: record.completedSteps,
      username: record.username,
      personalInfo: record.personalInfo,
      professionalProfile: record.professionalProfile,
      sections: this.parseSections(record.sections),
      templateSelection: record.templateSelection,
      updatedAt: record.updatedAt,
    };
  }

  async upsertProgress(
    userId: string,
    data: OnboardingProgressData,
  ): Promise<{ currentStep: string; completedSteps: string[] }> {
    const progressData = {
      currentStep: data.currentStep,
      completedSteps: data.completedSteps,
      username: data.username ?? undefined,
      personalInfo: data.personalInfo as InputJsonValue | undefined,
      professionalProfile: data.professionalProfile as InputJsonValue | undefined,
      sections: this.serializeSections(data.sections),
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

  async deleteProgress(userId: string): Promise<void> {
    await this.prisma.onboardingProgress.deleteMany({ where: { userId } });
  }

  async deleteProgressWithTx(tx: TransactionClient, userId: string): Promise<void> {
    const prismaTx = tx as Prisma.TransactionClient;
    await prismaTx.onboardingProgress.deleteMany({ where: { userId } });
  }

  /**
   * Parse sections from Prisma JSON to typed array.
   */
  private parseSections(value: Prisma.JsonValue | null): SectionProgressData[] | null {
    if (!Array.isArray(value)) return null;

    const sections: SectionProgressData[] = [];

    for (const item of value) {
      if (!this.isJsonObject(item)) continue;

      const sectionTypeKey = typeof item.sectionTypeKey === 'string' ? item.sectionTypeKey : '';

      if (sectionTypeKey.length === 0) continue;

      sections.push({
        sectionTypeKey,
        items: Array.isArray(item.items) ? (item.items as unknown[]) : undefined,
        noData: typeof item.noData === 'boolean' ? item.noData : undefined,
      });
    }

    return sections.length > 0 ? sections : null;
  }

  /**
   * Type guard for JsonObject.
   */
  private isJsonObject(value: Prisma.JsonValue): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Serialize sections to Prisma InputJsonValue.
   */
  private serializeSections(
    sections: SectionProgressData[] | undefined,
  ): InputJsonValue | undefined {
    if (!sections || sections.length === 0) return undefined;

    const serialized: InputJsonValue = sections.map((section) => ({
      sectionTypeKey: section.sectionTypeKey,
      items: (section.items ?? []) as InputJsonValue,
      noData: section.noData ?? false,
    }));

    return serialized;
  }

  async findUserByUsername(username: string): Promise<{ id: string } | null> {
    // Check both committed users AND users claiming username during onboarding
    const [existingUser, claimingProgress] = await Promise.all([
      this.prisma.user.findUnique({
        where: { username },
        select: { id: true },
      }),
      this.prisma.onboardingProgress.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } },
        select: { userId: true },
      }),
    ]);

    // Return existing user if found, or the user claiming username during onboarding
    return existingUser ?? (claimingProgress ? { id: claimingProgress.userId } : null);
  }
}
