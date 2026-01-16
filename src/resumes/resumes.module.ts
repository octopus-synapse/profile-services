import { Module } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { ResumesRepository } from './resumes.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumeVersionsModule } from '../resume-versions/resume-versions.module';
import { CacheModule } from '../common/cache/cache.module';
import { AuthorizationModule } from '../authorization';
import { ResumeManagementService } from './services/resume-management.service';
import { ResumeManagementController } from './controllers/resume-management.controller';
import {
  // Controllers
  ExperienceController,
  EducationController,
  SkillController,
  ProjectController,
  CertificationController,
  AwardController,
  LanguageController,
  InterestController,
  RecommendationController,
  AchievementController,
  PublicationController,
  TalkController,
  HackathonController,
  BugBountyController,
  OpenSourceController,
  // Services
  ExperienceService,
  EducationService,
  SkillService,
  ProjectService,
  CertificationService,
  AwardService,
  LanguageService,
  InterestService,
  RecommendationService,
  AchievementService,
  PublicationService,
  TalkService,
  HackathonService,
  BugBountyService,
  OpenSourceService,
  // Repositories
  ExperienceRepository,
  EducationRepository,
  SkillRepository,
  ProjectRepository,
  CertificationRepository,
  AwardRepository,
  LanguageRepository,
  InterestRepository,
  RecommendationRepository,
  AchievementRepository,
  PublicationRepository,
  TalkRepository,
  HackathonRepository,
  BugBountyRepository,
  OpenSourceRepository,
} from './module-imports';

@Module({
  imports: [
    PrismaModule,
    ResumeVersionsModule,
    CacheModule,
    AuthorizationModule,
  ],
  controllers: [
    ResumesController,
    ResumeManagementController,
    ExperienceController,
    EducationController,
    SkillController,
    ProjectController,
    CertificationController,
    AwardController,
    LanguageController,
    InterestController,
    RecommendationController,
    AchievementController,
    PublicationController,
    TalkController,
    HackathonController,
    BugBountyController,
    OpenSourceController,
  ],
  providers: [
    ResumesService,
    ResumesRepository,
    ResumeManagementService,
    // Sub-resource Services
    ExperienceService,
    EducationService,
    SkillService,
    ProjectService,
    CertificationService,
    AwardService,
    LanguageService,
    InterestService,
    RecommendationService,
    AchievementService,
    PublicationService,
    TalkService,
    HackathonService,
    BugBountyService,
    OpenSourceService,
    // Sub-resource Repositories
    ExperienceRepository,
    EducationRepository,
    SkillRepository,
    ProjectRepository,
    CertificationRepository,
    AwardRepository,
    LanguageRepository,
    InterestRepository,
    RecommendationRepository,
    AchievementRepository,
    PublicationRepository,
    TalkRepository,
    HackathonRepository,
    BugBountyRepository,
    OpenSourceRepository,
  ],
  exports: [
    ResumesService,
    ResumesRepository,
    ResumeManagementService,
    // Export services needed by GraphQL module
    ExperienceService,
    EducationService,
  ],
})
export class ResumesModule {}
