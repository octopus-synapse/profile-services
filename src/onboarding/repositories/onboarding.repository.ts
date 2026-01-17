import { Injectable } from '@nestjs/common';
import type { Prisma, ResumeTemplate } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * OnboardingRepository
 *
 * Encapsulates all Prisma operations for the onboarding module.
 * Following Repository Pattern: services depend on this abstraction,
 * not directly on PrismaService.
 *
 * Single Responsibility: Data access for onboarding-related entities.
 */
@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the Prisma client for use as a non-transactional context.
   * This allows services to call transactional methods without a transaction
   * when atomicity is not required.
   */
  getClient(): Prisma.TransactionClient {
    return this.prisma;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Transaction Support
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Execute operations within a transaction.
   * @param fn Transaction callback receiving the transaction client
   * @param options Transaction options (timeout, isolation level)
   */
  async transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout?: number },
  ): Promise<T> {
    return this.prisma.$transaction(fn, options);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User Operations
  // ─────────────────────────────────────────────────────────────────────────

  async findUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findUserByIdWithTx(tx: Prisma.TransactionClient, userId: string) {
    return tx.user.findUnique({ where: { id: userId } });
  }

  async findUserByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
  }

  async findUserOnboardingStatus(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { hasCompletedOnboarding: true, onboardingCompletedAt: true },
    });
  }

  async updateUserOnboardingComplete(
    tx: Prisma.TransactionClient,
    userId: string,
    data: {
      username: string;
      displayName: string;
      phone?: string | null;
      location?: string | null;
      bio: string;
      linkedin?: string | null;
      github?: string | null;
      website?: string | null;
    },
  ) {
    return tx.user.update({
      where: { id: userId },
      data: {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date(),
        username: data.username,
        displayName: data.displayName,
        phone: data.phone ?? null,
        location: data.location ?? null,
        bio: data.bio,
        linkedin: data.linkedin ?? null,
        github: data.github ?? null,
        website: data.website ?? null,
      },
    });
  }

  async setUserPrimaryResume(
    tx: Prisma.TransactionClient,
    userId: string,
    resumeId: string,
  ) {
    return tx.user.update({
      where: { id: userId },
      data: { primaryResumeId: resumeId },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Resume Operations
  // ─────────────────────────────────────────────────────────────────────────

  async findFirstResumeByUserId(tx: Prisma.TransactionClient, userId: string) {
    return tx.resume.findFirst({ where: { userId } });
  }

  async upsertResume(
    tx: Prisma.TransactionClient,
    existingResumeId: string | null,
    userId: string,
    data: {
      fullName: string;
      emailContact: string;
      phone?: string | null;
      location?: string | null;
      jobTitle: string;
      summary: string;
      linkedin?: string | null;
      github?: string | null;
      website?: string | null;
      template: ResumeTemplate;
    },
  ) {
    return tx.resume.upsert({
      where: { id: existingResumeId ?? 'nonexistent' },
      update: {
        fullName: data.fullName,
        emailContact: data.emailContact,
        phone: data.phone,
        location: data.location,
        jobTitle: data.jobTitle,
        summary: data.summary,
        linkedin: data.linkedin,
        github: data.github,
        website: data.website,
        template: data.template,
      },
      create: {
        userId,
        fullName: data.fullName,
        emailContact: data.emailContact,
        phone: data.phone,
        location: data.location,
        jobTitle: data.jobTitle,
        summary: data.summary,
        linkedin: data.linkedin,
        github: data.github,
        website: data.website,
        template: data.template,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Education Operations
  // ─────────────────────────────────────────────────────────────────────────

  async deleteEducationByResumeId(
    tx: Prisma.TransactionClient,
    resumeId: string,
  ) {
    return tx.education.deleteMany({ where: { resumeId } });
  }

  async createManyEducation(
    tx: Prisma.TransactionClient,
    data: Prisma.EducationCreateManyInput[],
  ) {
    return tx.education.createMany({ data });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Experience Operations
  // ─────────────────────────────────────────────────────────────────────────

  async deleteExperienceByResumeId(
    tx: Prisma.TransactionClient,
    resumeId: string,
  ) {
    return tx.experience.deleteMany({ where: { resumeId } });
  }

  async createManyExperience(
    tx: Prisma.TransactionClient,
    data: Prisma.ExperienceCreateManyInput[],
  ) {
    return tx.experience.createMany({ data });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Skills Operations
  // ─────────────────────────────────────────────────────────────────────────

  async deleteSkillsByResumeId(tx: Prisma.TransactionClient, resumeId: string) {
    return tx.skill.deleteMany({ where: { resumeId } });
  }

  async createManySkills(
    tx: Prisma.TransactionClient,
    data: Prisma.SkillCreateManyInput[],
  ) {
    return tx.skill.createMany({ data });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Languages Operations
  // ─────────────────────────────────────────────────────────────────────────

  async deleteLanguagesByResumeId(
    tx: Prisma.TransactionClient,
    resumeId: string,
  ) {
    return tx.language.deleteMany({ where: { resumeId } });
  }

  async createManyLanguages(
    tx: Prisma.TransactionClient,
    data: Prisma.LanguageCreateManyInput[],
  ) {
    return tx.language.createMany({ data });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Onboarding Progress Operations
  // ─────────────────────────────────────────────────────────────────────────

  async findOnboardingProgress(userId: string) {
    return this.prisma.onboardingProgress.findUnique({ where: { userId } });
  }

  async upsertOnboardingProgress(
    userId: string,
    data: {
      currentStep: string;
      completedSteps: string[];
      username?: string;
      personalInfo?: Prisma.InputJsonValue;
      professionalProfile?: Prisma.InputJsonValue;
      experiences?: Prisma.InputJsonValue;
      noExperience?: boolean;
      education?: Prisma.InputJsonValue;
      noEducation?: boolean;
      skills?: Prisma.InputJsonValue;
      noSkills?: boolean;
      languages?: Prisma.InputJsonValue;
      templateSelection?: Prisma.InputJsonValue;
    },
  ) {
    return this.prisma.onboardingProgress.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async deleteOnboardingProgress(userId: string) {
    return this.prisma.onboardingProgress.deleteMany({ where: { userId } });
  }

  async deleteOnboardingProgressWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
  ) {
    return tx.onboardingProgress.deleteMany({ where: { userId } });
  }
}
