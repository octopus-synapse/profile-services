/**
 * Resume Management Service
 *
 * Operations that require elevated permissions on resume resources.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: CRUD operations on resumes requiring 'resume:*' permissions.
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  RESUME_MANAGEMENT_USE_CASES,
  type ResumeManagementUseCases,
} from './resume-management/ports/resume-management.port';

@Injectable()
export class ResumeManagementService {
  constructor(
    @Inject(RESUME_MANAGEMENT_USE_CASES)
    private readonly useCases: ResumeManagementUseCases,
  ) {}

  // ============================================================================
  // Query Operations (require 'resume:read' or 'resume:manage')
  // ============================================================================

  /**
   * List all resumes for a specific user
   */
  async listResumesForUser(userId: string) {
    return this.useCases.listResumesForUserUseCase.execute(userId);
  }

  /**
   * Get full details of any resume
   */
  async getResumeDetails(resumeId: string) {
    return this.useCases.getResumeDetailsUseCase.execute(resumeId);
  }

  // ============================================================================
  // Mutation Operations (require 'resume:delete' or 'resume:manage')
  // ============================================================================

  /**
   * Delete any resume (elevated permission)
   */
  async deleteResume(resumeId: string): Promise<void> {
    await this.useCases.deleteResumeUseCase.execute(resumeId);
  }
}
