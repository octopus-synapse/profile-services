/**
 * Resumes Module - ADR-002: Modular Hexagonal Architecture
 *
 * Submodules: Resumes, Resume Versions, Section Types
 */

import { Module } from '@nestjs/common';
import { ResumesCoreModule } from './core/resumes.module';
import { ResumeVersionsModule } from './resume-versions/resume-versions.module';
import { AdminSectionTypesModule } from './section-types/admin-section-types.module';

@Module({
  imports: [ResumesCoreModule, ResumeVersionsModule, AdminSectionTypesModule],
  exports: [ResumesCoreModule, ResumeVersionsModule, AdminSectionTypesModule],
})
export class ResumesModule {}
