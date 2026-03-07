import { Module } from '@nestjs/common';
import { SkillManagementFacadeService } from './services/skill-management.service';

@Module({
  providers: [SkillManagementFacadeService],
  exports: [SkillManagementFacadeService],
})
export class SkillsModule {}
