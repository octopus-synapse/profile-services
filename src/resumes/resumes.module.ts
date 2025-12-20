import { Module } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { ResumesRepository } from './resumes.repository';
import { PrismaModule } from '../prisma/prisma.module';

// Sub-resource Controllers
import {
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
} from './controllers';

// Sub-resource Services
import {
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
} from './services';

// Sub-resource Repositories
import {
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
} from './repositories';

@Module({
  imports: [PrismaModule],
  controllers: [
    ResumesController,
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
  exports: [ResumesService, ResumesRepository],
})
export class ResumesModule {}
