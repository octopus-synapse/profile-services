import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { GitHubController } from './github.controller';
import { GitHubService } from './github.service';
import {
  GitHubAchievementService,
  GitHubApiService,
  GitHubContributionService,
  GitHubDatabaseService,
  GitHubSyncService,
} from './services';

@Module({
  imports: [PrismaModule],
  controllers: [GitHubController],
  providers: [
    GitHubService,
    GitHubApiService,
    GitHubContributionService,
    GitHubAchievementService,
    GitHubDatabaseService,
    GitHubSyncService,
  ],
  exports: [GitHubService],
})
export class GitHubModule {}
