import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResumesModule } from './resumes/resumes.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ExportModule } from './export/export.module';
import { UploadModule } from './upload/upload.module';
import { LoggerModule } from './common/logger/logger.module';
import { CacheModule } from './common/cache/cache.module';
import { AuditLogModule } from './common/audit/audit-log.module';
import { GitHubModule } from './integrations/github/github.module';
import { AdminModule } from './admin/admin.module';
import { ThemesModule } from './themes/themes.module';
import { MecSyncModule } from './mec-sync/mec-sync.module';
import { TechSkillsModule } from './tech-skills/tech-skills.module';
import { SpokenLanguagesModule } from './spoken-languages/spoken-languages.module';
import { TranslationModule } from './translation/translation.module';
import { HealthModule } from './health/health.module';
import { ATSModule } from './ats/ats.module';
import { DslModule } from './dsl/dsl.module';
import { GraphqlModule } from './graphql/graphql.module';
import { PublicResumesModule } from './public-resumes/public-resumes.module';
import { ResumeVersionsModule } from './resume-versions/resume-versions.module';
import { ShareAnalyticsModule } from './share-analytics/share-analytics.module';
import { validate } from './common/config/env.validation';
import { APP_CONSTANTS } from './common/constants/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: APP_CONSTANTS.RATE_LIMIT_TTL * 1000,
        limit: APP_CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
      },
    ]),
    LoggerModule,
    CacheModule,
    AuditLogModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ResumesModule,
    OnboardingModule,
    ExportModule,
    UploadModule,
    GitHubModule,
    AdminModule,
    ThemesModule,
    MecSyncModule,
    TechSkillsModule,
    SpokenLanguagesModule,
    TranslationModule,
    HealthModule,
    ATSModule,
    DslModule,
    GraphqlModule,
    PublicResumesModule,
    ResumeVersionsModule,
    ShareAnalyticsModule,
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
