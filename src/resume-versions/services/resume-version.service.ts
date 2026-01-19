import { Injectable } from '@nestjs/common';
import {
  ResumeNotFoundError,
  ResourceNotFoundError,
  ResourceOwnershipError,
} from '@octopus-synapse/profile-contracts';
import { ResumeVersionRepository } from '../repositories';

@Injectable()
export class ResumeVersionService {
  private readonly MAX_VERSIONS = 30;

  constructor(private readonly repository: ResumeVersionRepository) {}

  async createSnapshot(resumeId: string, label?: string) {
    // Get full resume data
    const resume = await this.repository.findResumeWithAllRelations(resumeId);

    if (!resume) {
      throw new ResumeNotFoundError(resumeId);
    }

    // Get next version number
    const lastVersion = await this.repository.findLastVersion(resumeId);

    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    // Create version
    const version = await this.repository.create({
      resumeId,
      versionNumber,
      snapshot: resume,
      label,
    });

    // Cleanup old versions (keep last 30)
    await this.repository.deleteOldVersions(resumeId, this.MAX_VERSIONS);

    return version;
  }

  async getVersions(resumeId: string, userId: string) {
    // Verify ownership
    await this.verifyOwnership(resumeId, userId);

    return this.repository.findAllByResumeId(resumeId);
  }

  async restoreVersion(resumeId: string, versionId: string, userId: string) {
    // Verify ownership
    await this.verifyOwnership(resumeId, userId);

    // Get version
    const version = await this.repository.findById(versionId);

    if (!version?.resumeId || version.resumeId !== resumeId) {
      throw new ResourceNotFoundError('version', versionId);
    }

    // Create a snapshot of current state before restore
    await this.createSnapshot(resumeId, 'Before restore');

    // Extract snapshot data
    const snapshot = version.snapshot as Record<string, unknown>;

    // Update resume with snapshot data (excluding relations)
    const {
      id: _id,
      userId: _userId,
      createdAt: _createdAt,
      ...resumeData
    } = snapshot;

    await this.repository.updateResume(resumeId, resumeData);

    return { success: true, restoredFrom: version.createdAt };
  }

  private async verifyOwnership(resumeId: string, userId: string) {
    const resume = await this.repository.findResumeOwner(resumeId);

    if (!resume) {
      throw new ResumeNotFoundError(resumeId);
    }

    if (resume.userId !== userId) {
      throw new ResourceOwnershipError('resume', resumeId);
    }
  }
}
