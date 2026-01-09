/**
 * Admin Service (Refactored)
 * Single Responsibility: Facade that delegates to specialized admin services
 */

import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminResetPasswordDto } from './dto/reset-password.dto';
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

  async getAllUsers(options: GetAllUsersOptions) {
    return this.userAdminService.getAll(options);
  }

  async getUserById(id: string) {
    return this.userAdminService.getById(id);
  }

  async createUser(createUserDto: CreateUserDto) {
    return this.userAdminService.create(createUserDto);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    return this.userAdminService.update(id, updateUserDto);
  }

  async deleteUser(id: string, requestingAdminId: string) {
    // Use GDPR-compliant cascading deletion (#70)
    return this.gdprDeletionService.deleteUserCompletely(id, requestingAdminId);
  }

  async resetUserPassword(id: string, dto: AdminResetPasswordDto) {
    return this.userAdminService.resetPassword(id, dto);
  }

  // ==================== Stats ====================

  async getStats() {
    return this.statsService.getStats();
  }

  // ==================== Resume Management ====================

  async getUserResumes(userId: string) {
    return this.resumeAdminService.getUserResumes(userId);
  }

  async getResumeById(resumeId: string) {
    return this.resumeAdminService.getById(resumeId);
  }

  async deleteResume(resumeId: string) {
    return this.resumeAdminService.delete(resumeId);
  }

  // ==================== Skills Management ====================

  async getResumeSkills(resumeId: string) {
    return this.skillAdminService.getByResume(resumeId);
  }

  async addSkillToResume(resumeId: string, data: CreateSkillData) {
    return this.skillAdminService.addToResume(resumeId, data);
  }

  async updateSkill(skillId: string, data: UpdateSkillData) {
    return this.skillAdminService.update(skillId, data);
  }

  async deleteSkill(skillId: string) {
    return this.skillAdminService.delete(skillId);
  }
}
