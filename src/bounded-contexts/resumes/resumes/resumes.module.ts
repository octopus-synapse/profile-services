import { Module } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { ResumesRepository } from './resumes.repository';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ResumeVersionsModule } from '@/bounded-contexts/resumes/resume-versions/resume-versions.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { ResumeManagementService } from './services/resume-management.service';
import { ResumeManagementController } from './controllers/resume-management.controller';
import {
  InvalidateCacheOnResumeUpdate,
  InvalidateCacheOnResumeDelete,
  CleanupResumesOnUserDeleteHandler,
} from '../application/handlers';
import { RESUME_EVENT_PUBLISHER } from '../domain/ports';
import { ResumeEventPublisherAdapter } from '../infrastructure/adapters';
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
