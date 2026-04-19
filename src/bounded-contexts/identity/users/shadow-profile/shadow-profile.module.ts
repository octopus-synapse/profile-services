import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { ShadowGithubApiAdapter } from './github-api.adapter';
import { SHADOW_GITHUB_API } from './ports/github-api.port';
import { ShadowProfileController } from './shadow-profile.controller';
import { ShadowProfileService } from './shadow-profile.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShadowProfileController],
  providers: [
    ShadowProfileService,
    ShadowGithubApiAdapter,
    { provide: SHADOW_GITHUB_API, useExisting: ShadowGithubApiAdapter },
  ],
  exports: [ShadowProfileService],
})
export class ShadowProfileModule {}
