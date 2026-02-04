import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RATE_LIMIT_CONFIG } from '@octopus-synapse/profile-contracts';

// Core & Platform
import { CustomThrottlerGuard } from '@/bounded-contexts/platform/common/guards/custom-throttler.guard';
import { validate } from '@/bounded-contexts/platform/common/config/env.validation';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { CacheModule } from '@/bounded-contexts/platform/common/cache/cache.module';
import { AuditLogModule } from '@/bounded-contexts/platform/common/audit/audit-log.module';
import { PlatformModule } from '@/bounded-contexts/platform/common/platform.module';
import { HealthModule } from '@/bounded-contexts/platform/health/health.module';
import { MetricsModule } from '@/bounded-contexts/platform/metrics/metrics.module';
import { GraphqlModule } from '@/bounded-contexts/platform/graphql/graphql.module';

// Shared Kernel
import { EventBusModule } from '@/shared-kernel/event-bus/event-bus.module';

// Identity Context
import { AuthModule } from '@/bounded-contexts/identity/auth/auth.module';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization/authorization.module';
import { UsersModule } from '@/bounded-contexts/identity/users/users.module';

// Resumes Context
import { ResumesModule } from '@/bounded-contexts/resumes/resumes/resumes.module';
import { ResumeVersionsModule } from '@/bounded-contexts/resumes/resume-versions/resume-versions.module';

// Presentation Context
import { ThemesModule } from '@/bounded-contexts/presentation/themes/themes.module';
import { PublicResumesModule } from '@/bounded-contexts/presentation/public-resumes/public-resumes.module';

// Export Context
import { ExportModule } from '@/bounded-contexts/export/export/export.module';

// Onboarding Context
import { OnboardingModule } from '@/bounded-contexts/onboarding/onboarding/onboarding.module';

// Integration Context
import { UploadModule } from '@/bounded-contexts/integration/upload/upload.module';
import { GitHubModule } from '@/bounded-contexts/integration/integrations/github/github.module';
import { MecSyncModule } from '@/bounded-contexts/integration/mec-sync/mec-sync.module';

// Analytics Context
import { ShareAnalyticsModule } from '@/bounded-contexts/analytics/share-analytics/share-analytics.module';
import { ResumeAnalyticsModule } from '@/bounded-contexts/analytics/resume-analytics/resume-analytics.module';
import { SearchModule } from '@/bounded-contexts/analytics/search/search.module';

// Collaboration Context
import { CollaborationModule } from '@/bounded-contexts/collaboration/collaboration/collaboration.module';
import { ChatModule } from '@/bounded-contexts/collaboration/chat/chat.module';

// Social Context (Activity Feed)
import { SocialModule } from '@/bounded-contexts/social/social/social.module';

// Skills Catalog Context
import { SkillsManagementModule } from '@/bounded-contexts/skills-catalog/skills/skills-management.module';
import { TechSkillsModule } from '@/bounded-contexts/skills-catalog/tech-skills/tech-skills.module';
import { SpokenLanguagesModule } from '@/bounded-contexts/skills-catalog/spoken-languages/spoken-languages.module';

// Translation Context
import { TranslationModule } from '@/bounded-contexts/translation/translation/translation.module';

// ATS Context
import { ATSModule } from '@/bounded-contexts/ats-validation/ats/ats.module';

// DSL Context
import { DslModule } from '@/bounded-contexts/dsl/dsl/dsl.module';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: RATE_LIMIT_CONFIG.TTL_MS,
        limit: RATE_LIMIT_CONFIG.MAX_REQUESTS,
      },
    ]),

    // Infrastructure & Core
    EventBusModule,
    LoggerModule,
    CacheModule,
    AuditLogModule,
    PrismaModule,
    PlatformModule,
    HealthModule,
    MetricsModule,
    GraphqlModule,

    // Domain Modules
    AuthorizationModule,
    AuthModule,
    UsersModule,
    ResumesModule,
    ResumeVersionsModule,
    OnboardingModule,
    ExportModule,
    UploadModule,
    GitHubModule,
    SkillsManagementModule,
    ThemesModule,
    MecSyncModule,
    TechSkillsModule,
    SpokenLanguagesModule,
    TranslationModule,
    ATSModule,
    DslModule,
    PublicResumesModule,
    ShareAnalyticsModule,
    ResumeAnalyticsModule,
    ChatModule,
    SearchModule,
    CollaborationModule,
    SocialModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
