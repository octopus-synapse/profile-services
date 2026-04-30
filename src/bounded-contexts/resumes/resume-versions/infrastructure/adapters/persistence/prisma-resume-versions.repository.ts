/**
 * Prisma implementation of `ResumeVersionsRepositoryPort`. Owns both the
 * versioning surface (snapshot CRUD, restore) and the tailor surface
 * (resume + job reads, tailored version listing).
 *
 * Keeps the BC's domain free of Prisma types — we translate
 * `Prisma.JsonValue` ↔ our pure `JsonValue` here so callers above never
 * see the database type.
 */

import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type {
  JsonValue,
  ResumeForSnapshot,
  ResumeVersionListItem,
  ResumeVersionRecord,
} from '../../../domain/entities/resume-version';
import type {
  JobForTailor,
  ResumeForTailor,
  TailoredVersionSummary,
} from '../../../domain/entities/tailor';
import { ResumeVersionsRepositoryPort } from '../../../domain/ports/resume-versions.repository.port';

const CTX = 'PrismaResumeVersionsRepository';

export class PrismaResumeVersionsRepository extends ResumeVersionsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async findResumeForSnapshot(resumeId: string): Promise<ResumeForSnapshot | null> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: {
        userId: true,
        resumeSections: {
          include: {
            sectionType: { select: { key: true, semanticKind: true, version: true } },
            items: { orderBy: { order: 'asc' }, select: { content: true } },
          },
        },
      },
    });

    if (!resume) {
      return null;
    }

    return {
      userId: resume.userId,
      resumeSections: resume.resumeSections.map((section) => ({
        sectionType: { semanticKind: section.sectionType.semanticKind },
        items: section.items.map((item) => ({ content: this.fromPrismaJson(item.content) })),
      })),
    };
  }

  async findLastVersionNumber(resumeId: string): Promise<number | null> {
    const lastVersion = await this.prisma.resumeVersion.findFirst({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    return lastVersion?.versionNumber ?? null;
  }

  async createResumeVersion(data: {
    resumeId: string;
    versionNumber: number;
    snapshot: Record<string, unknown>;
    label?: string;
    isTailored?: boolean;
    tailoredJobId?: string | null;
  }): Promise<ResumeVersionRecord> {
    const created = await this.prisma.resumeVersion.create({
      data: {
        resumeId: data.resumeId,
        versionNumber: data.versionNumber,
        snapshot: this.toPrismaInputJsonObject(data.snapshot),
        label: data.label ?? null,
        isTailored: data.isTailored ?? false,
        tailoredJobId: data.tailoredJobId ?? null,
      },
      select: {
        id: true,
        resumeId: true,
        versionNumber: true,
        snapshot: true,
        label: true,
        createdAt: true,
      },
    });

    return { ...created, snapshot: this.fromPrismaJson(created.snapshot) };
  }

  findResumeOwner(resumeId: string): Promise<{ userId: string } | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
  }

  findResumeVersions(resumeId: string): Promise<ResumeVersionListItem[]> {
    return this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true, versionNumber: true, label: true, createdAt: true },
    });
  }

  async findResumeVersionById(versionId: string): Promise<ResumeVersionRecord | null> {
    const version = await this.prisma.resumeVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        resumeId: true,
        versionNumber: true,
        snapshot: true,
        label: true,
        createdAt: true,
      },
    });

    if (!version) {
      return null;
    }

    return { ...version, snapshot: this.fromPrismaJson(version.snapshot) };
  }

  async updateResumeFromSnapshot(
    resumeId: string,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: this.toResumeUpdateData(snapshot),
    });
  }

  async findVersionIdsByResumeIdDesc(resumeId: string): Promise<string[]> {
    const versions = await this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });

    return versions.map((version) => version.id);
  }

  async deleteVersionsByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      this.logger.debug?.('Skipping empty deleteVersionsByIds', CTX);
      return;
    }

    await this.prisma.resumeVersion.deleteMany({
      where: { id: { in: ids } },
    });
  }

  // -------- Tailor --------

  async findResumeForTailor(resumeId: string): Promise<ResumeForTailor | null> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: {
        id: true,
        userId: true,
        summary: true,
        jobTitle: true,
        primaryStack: true,
        resumeSections: {
          include: {
            sectionType: { select: { key: true, semanticKind: true } },
            items: { orderBy: { order: 'asc' }, select: { id: true, content: true } },
          },
        },
      },
    });

    if (!resume) return null;

    return {
      id: resume.id,
      userId: resume.userId,
      summary: resume.summary,
      jobTitle: resume.jobTitle,
      primaryStack: resume.primaryStack ?? [],
      resumeSections: resume.resumeSections.map((section) => ({
        sectionType: {
          key: section.sectionType.key,
          semanticKind: section.sectionType.semanticKind,
        },
        items: section.items.map((item) => ({
          id: item.id,
          content: (item.content ?? {}) as Record<string, unknown>,
        })),
      })),
    };
  }

  async findJobById(jobId: string): Promise<JobForTailor | null> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return null;
    return {
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements,
      skills: job.skills,
    };
  }

  async findTailoredVersions(resumeId: string): Promise<TailoredVersionSummary[]> {
    return this.prisma.resumeVersion.findMany({
      where: { resumeId, isTailored: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        createdAt: true,
        tailoredJobId: true,
      },
    });
  }

  // ---------- JSON marshalling ----------

  private fromPrismaJson(value: Prisma.JsonValue): JsonValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.fromPrismaJson(item));
    }

    const result: { [key: string]: JsonValue | undefined } = {};

    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        result[key] = this.fromPrismaJson(item);
      }
    }

    return result;
  }

  private toPrismaInputJsonValue(value: unknown): Prisma.InputJsonValue | null {
    if (value === null) {
      return null;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      const parsedArray = value
        .map((item) => this.toPrismaInputJsonValue(item))
        .filter((item): item is Prisma.InputJsonValue => item !== null);
      return parsedArray;
    }

    if (value && typeof value === 'object') {
      const parsedObject: Record<string, Prisma.InputJsonValue> = {};

      for (const [key, item] of Object.entries(value)) {
        const parsedValue = this.toPrismaInputJsonValue(item);
        if (parsedValue !== null) {
          parsedObject[key] = parsedValue;
        }
      }

      return parsedObject;
    }

    return null;
  }

  private toPrismaInputJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
    const parsedObject: Record<string, Prisma.InputJsonValue> = {};

    for (const [key, item] of Object.entries(value)) {
      const parsedValue = this.toPrismaInputJsonValue(item);
      if (parsedValue !== null) {
        parsedObject[key] = parsedValue;
      }
    }

    return parsedObject;
  }

  private toResumeUpdateData(snapshot: Record<string, unknown>): Prisma.ResumeUncheckedUpdateInput {
    const data: Prisma.ResumeUncheckedUpdateInput = {};

    this.setStringOrNull(data, 'title', snapshot.title);
    this.setString(data, 'language', snapshot.language);
    this.setBoolean(data, 'isPublic', snapshot.isPublic);
    this.setStringOrNull(data, 'slug', snapshot.slug);
    this.setJson(data, 'contentPtBr', snapshot.contentPtBr);
    this.setJson(data, 'contentEn', snapshot.contentEn);
    this.setString(data, 'primaryLanguage', snapshot.primaryLanguage);
    this.setStringOrNull(data, 'techPersona', snapshot.techPersona);
    this.setStringOrNull(data, 'techArea', snapshot.techArea);
    this.setStringArray(data, 'primaryStack', snapshot.primaryStack);
    this.setNumberOrNull(data, 'experienceYears', snapshot.experienceYears);
    this.setStringOrNull(data, 'fullName', snapshot.fullName);
    this.setStringOrNull(data, 'jobTitle', snapshot.jobTitle);
    this.setStringOrNull(data, 'phone', snapshot.phone);
    this.setStringOrNull(data, 'location', snapshot.location);
    this.setStringOrNull(data, 'linkedin', snapshot.linkedin);
    this.setStringOrNull(data, 'github', snapshot.github);
    this.setStringOrNull(data, 'website', snapshot.website);
    this.setSummary(data, snapshot.summary);
    this.setStringOrNull(data, 'currentCompanyLogo', snapshot.currentCompanyLogo);
    this.setStringOrNull(data, 'twitter', snapshot.twitter);
    this.setStringOrNull(data, 'medium', snapshot.medium);
    this.setStringOrNull(data, 'devto', snapshot.devto);
    this.setStringOrNull(data, 'stackoverflow', snapshot.stackoverflow);
    this.setStringOrNull(data, 'kaggle', snapshot.kaggle);
    this.setStringOrNull(data, 'hackerrank', snapshot.hackerrank);
    this.setStringOrNull(data, 'leetcode', snapshot.leetcode);
    this.setStringOrNull(data, 'accentColor', snapshot.accentColor);
    this.setJson(data, 'customTheme', snapshot.customTheme);
    this.setStringOrNull(data, 'styleId', snapshot.styleId);
    this.setNumber(data, 'profileViews', snapshot.profileViews);
    this.setNumber(data, 'totalStars', snapshot.totalStars);
    this.setNumber(data, 'totalCommits', snapshot.totalCommits);
    this.setDateOrNull(data, 'publishedAt', snapshot.publishedAt);

    return data;
  }

  private setStringOrNull(
    data: Prisma.ResumeUncheckedUpdateInput,
    key:
      | 'title'
      | 'slug'
      | 'techPersona'
      | 'techArea'
      | 'fullName'
      | 'jobTitle'
      | 'phone'
      | 'location'
      | 'linkedin'
      | 'github'
      | 'website'
      | 'currentCompanyLogo'
      | 'twitter'
      | 'medium'
      | 'devto'
      | 'stackoverflow'
      | 'kaggle'
      | 'hackerrank'
      | 'leetcode'
      | 'accentColor'
      | 'styleId',
    value: unknown,
  ): void {
    if (typeof value === 'string' || value === null) {
      data[key] = value;
    }
  }

  private setSummary(data: Prisma.ResumeUncheckedUpdateInput, value: unknown): void {
    if (typeof value === 'string' || value === null) {
      data.summary = value;
    }
  }

  private setString(
    data: Prisma.ResumeUncheckedUpdateInput,
    key: 'language' | 'primaryLanguage',
    value: unknown,
  ): void {
    if (typeof value === 'string') {
      data[key] = value;
    }
  }

  private setBoolean(
    data: Prisma.ResumeUncheckedUpdateInput,
    key: 'isPublic',
    value: unknown,
  ): void {
    if (typeof value === 'boolean') {
      data[key] = value;
    }
  }

  private setNumber(
    data: Prisma.ResumeUncheckedUpdateInput,
    key: 'profileViews' | 'totalStars' | 'totalCommits',
    value: unknown,
  ): void {
    if (typeof value === 'number') {
      data[key] = value;
    }
  }

  private setNumberOrNull(
    data: Prisma.ResumeUncheckedUpdateInput,
    key: 'experienceYears',
    value: unknown,
  ): void {
    if (typeof value === 'number' || value === null) {
      data[key] = value;
    }
  }

  private setDateOrNull(
    data: Prisma.ResumeUncheckedUpdateInput,
    key: 'publishedAt',
    value: unknown,
  ): void {
    if (value === null) {
      data[key] = null;
      return;
    }

    if (value instanceof Date) {
      data[key] = value;
      return;
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        data[key] = date;
      }
    }
  }

  private setStringArray(
    data: Prisma.ResumeUncheckedUpdateInput,
    key: 'primaryStack',
    value: unknown,
  ): void {
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      data[key] = value;
    }
  }

  private setJson(
    data: Prisma.ResumeUncheckedUpdateInput,
    key: 'contentPtBr' | 'contentEn' | 'customTheme',
    value: unknown,
  ): void {
    if (value === null) {
      data[key] = Prisma.DbNull;
      return;
    }

    const parsed = this.toPrismaInputJsonValue(value);
    if (parsed !== null) {
      data[key] = parsed;
    }
  }
}
