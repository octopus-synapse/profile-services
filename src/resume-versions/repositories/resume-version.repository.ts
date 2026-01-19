/**
 * Resume Version Repository
 * Data access layer for resume version operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ResumeVersion, Resume } from '@prisma/client';

interface ResumeWithRelations {
  id: string;
  userId: string;
  experiences: unknown[];
  education: unknown[];
  skills: unknown[];
  languages: unknown[];
  projects: unknown[];
  certifications: unknown[];
  awards: unknown[];
  recommendations: unknown[];
  interests: unknown[];
  achievements: unknown[];
  publications: unknown[];
  talks: unknown[];
  openSource: unknown[];
  bugBounties: unknown[];
  hackathons: unknown[];
}

@Injectable()
export class ResumeVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a resume with all its relations for snapshotting
   */
  async findResumeWithAllRelations(
    resumeId: string,
  ): Promise<ResumeWithRelations | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        experiences: true,
        education: true,
        skills: true,
        languages: true,
        projects: true,
        certifications: true,
        awards: true,
        recommendations: true,
        interests: true,
        achievements: true,
        publications: true,
        talks: true,
        openSource: true,
        bugBounties: true,
        hackathons: true,
      },
    }) as Promise<ResumeWithRelations | null>;
  }

  /**
   * Find the last version for a resume
   */
  async findLastVersion(
    resumeId: string,
  ): Promise<{ versionNumber: number } | null> {
    return this.prisma.resumeVersion.findFirst({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
  }

  /**
   * Create a new version
   */
  async create(data: {
    resumeId: string;
    versionNumber: number;
    snapshot: unknown;
    label?: string;
  }): Promise<ResumeVersion> {
    return this.prisma.resumeVersion.create({
      data: {
        resumeId: data.resumeId,
        versionNumber: data.versionNumber,
        snapshot: data.snapshot as never,
        label: data.label,
      },
    });
  }

  /**
   * Find all versions for a resume
   */
  async findAllByResumeId(resumeId: string): Promise<
    Array<{
      id: string;
      versionNumber: number;
      label: string | null;
      createdAt: Date;
    }>
  > {
    return this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        createdAt: true,
      },
    });
  }

  /**
   * Find a version by ID
   */
  async findById(versionId: string): Promise<ResumeVersion | null> {
    return this.prisma.resumeVersion.findUnique({
      where: { id: versionId },
    });
  }

  /**
   * Update a resume with snapshot data
   */
  async updateResume(
    resumeId: string,
    data: Record<string, unknown>,
  ): Promise<Resume> {
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: data as never,
    });
  }

  /**
   * Find a resume owner by ID
   */
  async findResumeOwner(resumeId: string): Promise<{ userId: string } | null> {
    return this.prisma.resume.findUnique({
      where: { id: resumeId },
      select: { userId: true },
    });
  }

  /**
   * Delete old versions beyond the limit
   */
  async deleteOldVersions(
    resumeId: string,
    maxVersions: number,
  ): Promise<void> {
    const versions = await this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNumber: 'desc' },
      select: { id: true },
    });

    if (versions.length > maxVersions) {
      const toDelete = versions.slice(maxVersions);
      await this.prisma.resumeVersion.deleteMany({
        where: {
          id: { in: toDelete.map((v) => v.id) },
        },
      });
    }
  }
}
