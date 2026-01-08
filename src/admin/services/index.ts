/**
 * Admin Services Index
 * Barrel export for all admin services
 */

export { UserAdminService } from './user-admin.service';
export type { GetAllUsersOptions } from './user-admin-query.service';
export { UserAdminQueryService } from './user-admin-query.service';
export { UserAdminMutationService } from './user-admin-mutation.service';
export { AdminStatsService } from './admin-stats.service';
export { ResumeAdminService } from './resume-admin.service';
export { SkillAdminService } from './skill-admin.service';
export type { CreateSkillData, UpdateSkillData } from './skill-admin.service';
