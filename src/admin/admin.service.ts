/**
 * Admin Service (Refactored)
 * Single Responsibility: Facade that delegates to specialized admin services
 */

import { Injectable } from '@nestjs/common';
import type {
  AdminCreateUser,
  AdminUpdateUser,
  AdminResetPassword,
} from '@octopus-synapse/profile-contracts';
import {
  UserAdminService,
  GetAllUsersOptions,
  AdminStatsService,
  ResumeAdminService,
  SkillAdminService,
  CreateSkillData,
  UpdateSkillData,
} from './services';
import { GdprDeletionService } from '../auth/services/gdpr-deletion.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly userAdminService: UserAdminService,
    private readonly statsService: AdminStatsService,
    private readonly resumeAdminService: ResumeAdminService,
    private readonly skillAdminService: SkillAdminService,
    private readonly gdprDeletionService: GdprDeletionService,
  ) {}

  // ==================== User Management ====================

  async findAllUsersWithPagination(queryOptions: GetAllUsersOptions) {
    return this.userAdminService.findAllUsersWithPagination(queryOptions);
  }

  async findUserByIdWithDetails(userId: string) {
    return this.userAdminService.findUserByIdWithDetails(userId);
  }

  async createUserAccount(createUserData: AdminCreateUser) {
    return this.userAdminService.createUserAccount(createUserData);
  }

  async updateUserAccount(userId: string, updateUserData: AdminUpdateUser) {
    return this.userAdminService.updateUserAccount(userId, updateUserData);
  }

  async deleteUserAccount(userId: string, requestingAdminId: string) {
    // Use GDPR-compliant cascading deletion (#70)
    return this.gdprDeletionService.deleteUserCompletely(
      userId,
      requestingAdminId,
    );
  }

  async resetUserPassword(
    userId: string,
    resetPasswordData: AdminResetPassword,
  ) {
    return this.userAdminService.resetUserPassword(userId, resetPasswordData);
  }

  // ==================== Stats ====================

  async getPlatformStatistics() {
    return this.statsService.getPlatformStatistics();
  }

  // ==================== Resume Management ====================

  async findAllResumesForUser(userId: string) {
    return this.resumeAdminService.findAllResumesForUser(userId);
  }

  async findResumeByIdForAdmin(resumeId: string) {
    return this.resumeAdminService.findResumeByIdForAdmin(resumeId);
  }

  async deleteResumeForAdmin(resumeId: string) {
    return this.resumeAdminService.deleteResumeForAdmin(resumeId);
  }

  // ==================== Skills Management ====================

  async findAllSkillsForResume(resumeId: string) {
    return this.skillAdminService.findAllSkillsForResume(resumeId);
  }

  async addSkillToResume(resumeId: string, skillData: CreateSkillData) {
    return this.skillAdminService.addSkillToResume(resumeId, skillData);
  }

  async updateSkill(skillId: string, updateSkillData: UpdateSkillData) {
    return this.skillAdminService.updateSkill(skillId, updateSkillData);
  }

  async deleteSkill(skillId: string) {
    return this.skillAdminService.deleteSkill(skillId);
  }
}
