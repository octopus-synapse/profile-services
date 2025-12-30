import { Module } from '@nestjs/common';
import { GitHubService } from './github.service';
import { GitHubController } from './github.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import {
  GitHubApiService,
  GitHubContributionService,
  GitHubAchievementService,
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
