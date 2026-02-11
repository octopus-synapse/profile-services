import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ResumeVersionsModule } from '@/bounded-contexts/resumes/resume-versions/resume-versions.module';
import {
  CleanupResumesOnUserDeleteHandler,
  InvalidateCacheOnResumeDelete,
  InvalidateCacheOnResumeUpdate,
} from '../application/handlers';
import { RESUME_EVENT_PUBLISHER } from '../domain/ports';
import { ResumeEventPublisherAdapter } from '../infrastructure/adapters';
import { ResumeManagementController } from './controllers/resume-management.controller';
import {
  AchievementController,
  AchievementRepository,
  AchievementService,
  AwardController,
  AwardRepository,
  AwardService,
  BugBountyController,
  BugBountyRepository,
  BugBountyService,
  CertificationController,
  CertificationRepository,
  CertificationService,
  EducationController,
  EducationRepository,
  EducationService,
  // Controllers
  ExperienceController,
  // Repositories
  ExperienceRepository,
  // Services
  ExperienceService,
  HackathonController,
  HackathonRepository,
  HackathonService,
  InterestController,
  InterestRepository,
  InterestService,
  LanguageController,
  LanguageRepository,
  LanguageService,
  OpenSourceController,
  OpenSourceRepository,
  OpenSourceService,
  ProjectController,
  ProjectRepository,
  ProjectService,
  PublicationController,
  PublicationRepository,
  PublicationService,
  RecommendationController,
  RecommendationRepository,
  RecommendationService,
  SkillController,
  SkillRepository,
  SkillService,
  TalkController,
  TalkRepository,
  TalkService,
} from './module-imports';
import { ResumesController } from './resumes.controller';
import { ResumesRepository } from './resumes.repository';
import { ResumesService } from './resumes.service';
import { ResumeManagementService } from './services/resume-management.service';

@Module({
  imports: [PrismaModule, ResumeVersionsModule, CacheModule, AuthorizationModule],
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
    // Event Handlers
    InvalidateCacheOnResumeUpdate,
    InvalidateCacheOnResumeDelete,
    CleanupResumesOnUserDeleteHandler,
    // Port Adapters
    {
      provide: RESUME_EVENT_PUBLISHER,
      useClass: ResumeEventPublisherAdapter,
    },
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
