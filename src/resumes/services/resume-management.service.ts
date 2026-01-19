/**
 * Resume Management Service
 *
 * Operations that require elevated permissions on resume resources.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: CRUD operations on resumes requiring 'resume:*' permissions.
 */

import { Injectable } from '@nestjs/common';
import {
  ResumeNotFoundError,
  UserNotFoundError,
} from '@octopus-synapse/profile-contracts';
import { ResumeManagementRepository } from '../repositories/resume-management.repository';

@Injectable()
export class ResumeManagementService {
  constructor(private readonly repository: ResumeManagementRepository) {}

  // ============================================================================
  // Query Operations (require 'resume:read' or 'resume:manage')
  // ============================================================================

  /**
   * List all resumes for a specific user
   */
  async listResumesForUser(userId: string) {
    await this.ensureUserExists(userId);

    const resumes = await this.repository.findAllByUserId(userId);

    return { resumes };
  }

  /**
   * Get full details of any resume
   */
  async getResumeDetails(resumeId: string) {
    const resume = await this.repository.findByIdWithRelations(resumeId);

    if (!resume) {
      throw new ResumeNotFoundError(resumeId);
    }

    return resume;
  }

  // ============================================================================
  // Mutation Operations (require 'resume:delete' or 'resume:manage')
  // ============================================================================

  /**
   * Delete any resume (elevated permission)
   */
  async deleteResume(resumeId: string) {
    await this.ensureResumeExists(resumeId);

    await this.repository.delete(resumeId);

    return {
      success: true,
      message: 'Resume deleted successfully',
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new UserNotFoundError(userId);
    }
  }

  private async ensureResumeExists(resumeId: string): Promise<void> {
    const resume = await this.repository.findById(resumeId);

    if (!resume) {
      throw new ResumeNotFoundError(resumeId);
    }
  }
}
