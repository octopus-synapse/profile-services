/**
 * Prisma implementation of `ResumeVersionsRepositoryPort`. Owns both the
 * versioning surface (snapshot CRUD, restore) and the tailor surface
 * (resume + job reads, tailored version listing).
 *
 * JSON marshalling and snapshot → ResumeUpdateInput mapping live in
 * `prisma-resume-versions.mappers.ts`.
 */

import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type {
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
import {
  fromPrismaJson,
  toPrismaInputJsonObject,
  toResumeUpdateData,
} from './prisma-resume-versions.mappers';

const CTX = 'PrismaResumeVersionsRepository';

// Retry budget for the `@@unique([resumeId, versionNumber])` race.
// Real-world contention is two concurrent tailor calls; ten retries
// covers far worse pathology while still failing fast on a genuine bug.
const CREATE_VERSION_MAX_RETRIES = 10;
const UNIQUE_VIOLATION_CODE = 'P2002';

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

    if (!resume) return null;

    return {
      userId: resume.userId,
      resumeSections: resume.resumeSections.map((section) => ({
        sectionType: { semanticKind: section.sectionType.semanticKind },
        items: section.items.map((item) => ({ content: fromPrismaJson(item.content) })),
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
        snapshot: toPrismaInputJsonObject(data.snapshot),
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
    return { ...created, snapshot: fromPrismaJson(created.snapshot) };
  }

  async createNextResumeVersion(
    resumeId: string,
    data: {
      snapshot: Record<string, unknown>;
      label?: string;
      isTailored?: boolean;
      tailoredJobId?: string | null;
    },
  ): Promise<ResumeVersionRecord> {
    // P1 #16 — two concurrent snapshot/tailor calls used to race on
    // `lastVersion + 1`, both insert rows with the same versionNumber,
    // and one always failed (or worse — a missing unique would let
    // duplicates land). With the `@@unique([resumeId, versionNumber])`
    // constraint Postgres rejects the loser; we catch the violation
    // and retry with the next sequence value.
    let lastError: unknown = null;
    for (let attempt = 0; attempt < CREATE_VERSION_MAX_RETRIES; attempt++) {
      const lastVersion = await this.prisma.resumeVersion.findFirst({
        where: { resumeId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;
      try {
        const created = await this.prisma.resumeVersion.create({
          data: {
            resumeId,
            versionNumber,
            snapshot: toPrismaInputJsonObject(data.snapshot),
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
        return { ...created, snapshot: fromPrismaJson(created.snapshot) };
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === UNIQUE_VIOLATION_CODE
        ) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    this.logger.error?.('ResumeVersion next-version retry budget exhausted', {
      context: CTX,
      resumeId,
    });
    throw lastError ?? new Error('createNextResumeVersion: retry budget exhausted');
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
    if (!version) return null;
    return { ...version, snapshot: fromPrismaJson(version.snapshot) };
  }

  async updateResumeFromSnapshot(
    resumeId: string,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.resume.update({
      where: { id: resumeId },
      data: toResumeUpdateData(snapshot),
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
    await this.prisma.resumeVersion.deleteMany({ where: { id: { in: ids } } });
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
}
