import { Prisma, Resume } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { type CreateResumeData, LoggerPort, type UpdateResumeData } from '@/shared-kernel';
import type { DomainException } from '@/shared-kernel/exceptions';
import { enforceQuotaInTx } from '@/shared-kernel/persistence/quota-guard';
import { runInTransaction } from '@/shared-kernel/persistence/transaction';
import { ResumeAccessDeniedException, ResumeNotFoundException } from '../domain/exceptions';
import { ResumesRepositoryPort } from './ports/resumes-repository.port';

const CTX = 'ResumesRepository';

/** Nullable Json columns require the `Prisma.JsonNull` sentinel on write. */
function jsonOrDbNull(value: Prisma.JsonValue | null) {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

export class ResumesRepository extends ResumesRepositoryPort {
  private readonly includeRelations = {
    resumeSections: {
      orderBy: { order: 'asc' as const },
      include: {
        sectionType: true,
        items: {
          orderBy: { order: 'asc' as const },
        },
      },
    },
    style: {
      select: { id: true, name: true, description: true },
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async listUserResumes(userId: string): Promise<Resume[]> {
    return await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findResumeByIdAndUserId(id: string, userId: string): Promise<Resume | null> {
    return await this.prisma.resume.findFirst({
      where: { id, userId },
      include: this.includeRelations,
    });
  }

  async createResumeForUser(userId: string, resumeCreationData: CreateResumeData): Promise<Resume> {
    this.logger.log(`Creating resume for user: ${userId}`, CTX);
    const resumeData = { userId, ...resumeCreationData };
    return await this.prisma.resume.create({ data: resumeData });
  }

  async createResumeForUserWithQuota(
    userId: string,
    resumeCreationData: CreateResumeData,
    quota: { readonly max: number; readonly exception: DomainException },
  ): Promise<Resume> {
    this.logger.log(`Creating resume (with quota guard) for user: ${userId}`, CTX);
    return await runInTransaction(this.prisma, async (tx) => {
      await enforceQuotaInTx(tx, {
        // Serialise on the User row so two concurrent POST /v1/resumes from
        // the same user observe each other's counts. Postgres rejects
        // `FOR UPDATE` in the same query as `COUNT(*)` (error 0A000), so
        // lock + count are split into two queries inside one tx.
        lockSql: Prisma.sql`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR UPDATE`,
        countSql: Prisma.sql`SELECT COUNT(*)::int AS "count" FROM "Resume" WHERE "userId" = ${userId}`,
        max: quota.max,
        exception: quota.exception,
      });
      const resumeData = { userId, ...resumeCreationData };
      return await tx.resume.create({ data: resumeData });
    });
  }

  async duplicateResumeForUserWithQuota(
    userId: string,
    sourceResumeId: string,
    overrides: { readonly title: string; readonly styleId?: string; readonly language?: string },
    sectionFilter: ReadonlyArray<{
      readonly sectionTypeKey: string;
      readonly itemIds?: readonly string[];
    }> | null,
    quota: { readonly max: number; readonly exception: DomainException },
  ): Promise<Resume> {
    this.logger.log(
      `Duplicating resume ${sourceResumeId} (with quota guard) for user: ${userId}`,
      CTX,
    );
    return await runInTransaction(this.prisma, async (tx) => {
      await enforceQuotaInTx(tx, {
        lockSql: Prisma.sql`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR UPDATE`,
        countSql: Prisma.sql`SELECT COUNT(*)::int AS "count" FROM "Resume" WHERE "userId" = ${userId}`,
        max: quota.max,
        exception: quota.exception,
      });

      // Re-read inside the tx so the copy is consistent with concurrent edits.
      const source = await tx.resume.findFirst({
        where: { id: sourceResumeId, userId },
        include: {
          resumeSections: {
            orderBy: { order: 'asc' },
            include: { sectionType: true, items: { orderBy: { order: 'asc' } } },
          },
        },
      });
      if (!source) throw new ResumeNotFoundException();

      const copy = await tx.resume.create({
        data: {
          userId,
          title: overrides.title,
          language: overrides.language ?? source.language,
          styleId: overrides.styleId ?? source.styleId,
          contentPtBr: jsonOrDbNull(source.contentPtBr),
          contentEn: jsonOrDbNull(source.contentEn),
          primaryLanguage: source.primaryLanguage,
          techPersona: source.techPersona,
          techArea: source.techArea,
          primaryStack: source.primaryStack,
          experienceYears: source.experienceYears,
          fullName: source.fullName,
          jobTitle: source.jobTitle,
          phone: source.phone,
          location: source.location,
          linkedin: source.linkedin,
          github: source.github,
          website: source.website,
          summary: source.summary,
          currentCompanyLogo: source.currentCompanyLogo,
          twitter: source.twitter,
          medium: source.medium,
          devto: source.devto,
          stackoverflow: source.stackoverflow,
          kaggle: source.kaggle,
          hackerrank: source.hackerrank,
          leetcode: source.leetcode,
          accentColor: source.accentColor,
          customTheme: jsonOrDbNull(source.customTheme),
          // Publish/stat state is per-document, not content — the copy
          // starts unpublished with fresh analytics.
          slug: null,
          isPublic: false,
          publishedAt: null,
          profileViews: 0,
          totalStars: 0,
          totalCommits: 0,
        },
      });

      for (const section of source.resumeSections) {
        const filter = sectionFilter?.find((f) => f.sectionTypeKey === section.sectionType.key);
        if (sectionFilter && !filter) continue;

        const items = filter?.itemIds
          ? section.items.filter((item) => filter.itemIds?.includes(item.id))
          : section.items;

        const copiedSection = await tx.resumeSection.create({
          data: {
            resumeId: copy.id,
            sectionTypeId: section.sectionTypeId,
            titleOverride: section.titleOverride,
            isVisible: section.isVisible,
            order: section.order,
          },
        });

        if (items.length > 0) {
          await tx.sectionItem.createMany({
            data: items.map((item) => ({
              resumeSectionId: copiedSection.id,
              content: jsonOrDbNull(item.content),
              isVisible: item.isVisible,
              order: item.order,
            })),
          });
        }
      }

      return copy;
    });
  }

  async updateResumeForUser(
    id: string,
    userId: string,
    resumeUpdateData: UpdateResumeData,
  ): Promise<Resume | null> {
    this.logger.log(`Updating resume: ${id}`, CTX);

    await this.ensureResumeOwnership(id, userId);

    return await this.prisma.resume.update({
      where: { id },
      data: resumeUpdateData,
    });
  }

  async deleteResumeForUser(id: string, userId: string): Promise<boolean> {
    this.logger.log(`Deleting resume: ${id}`, CTX);

    // Use deleteMany with both id and userId to avoid race conditions
    // This is atomic and handles concurrent delete requests gracefully
    const result = await this.prisma.resume.deleteMany({
      where: { id, userId },
    });

    // If count is 0, either the resume doesn't exist or user doesn't own it
    if (result.count === 0) {
      // Check if resume exists but belongs to another user
      const resume = await this.prisma.resume.findUnique({ where: { id } });
      if (resume) {
        throw new ResumeAccessDeniedException();
      }
      // Resume doesn't exist - could have been deleted by concurrent request
      throw new ResumeNotFoundException();
    }

    return true;
  }

  private async ensureResumeOwnership(id: string, userId: string): Promise<void> {
    const resume = await this.findResumeByIdAndUserId(id, userId);
    if (!resume) {
      throw new ResumeAccessDeniedException();
    }
  }

  async findResumeByUserId(userId: string): Promise<Resume | null> {
    return await this.prisma.resume.findFirst({
      where: { userId },
      include: this.includeRelations,
    });
  }

  /**
   * BUG-015 FIX: Proper database pagination
   */
  async listUserResumesPaginated(userId: string, skip: number, take: number): Promise<Resume[]> {
    return await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    });
  }

  /**
   * BUG-015 FIX: Count for pagination
   */
  async countUserResumes(userId: string): Promise<number> {
    return await this.prisma.resume.count({
      where: { userId },
    });
  }
}
