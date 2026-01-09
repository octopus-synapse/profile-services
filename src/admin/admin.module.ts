import { Module } from '@nestjs/common';
import {
  AdminUsersController,
  AdminResumesController,
  AdminSkillsController,
} from './controllers';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import {
  UserAdminService,
  UserAdminQueryService,
  UserAdminMutationService,
  AdminStatsService,
  ResumeAdminService,
  SkillAdminService,
  AuditService,
} from './services';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminUsersController,
    AdminResumesController,
    AdminSkillsController,
  ],
  providers: [
    AdminService,
    UserAdminQueryService,
    UserAdminMutationService,
    UserAdminService,
    AdminStatsService,
    ResumeAdminService,
    SkillAdminService,
    AuditService,
  ],
  exports: [AdminService, AuditService],
})
export class AdminModule {}
