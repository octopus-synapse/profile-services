import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { ShadowGithubApiAdapter } from './github-api.adapter';
import { ShadowGithubApi } from './ports/github-api.port';
import { shadowProfileRoutes } from './shadow-profile.routes';
import { ShadowProfileService } from './shadow-profile.service';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(ShadowProfileService, shadowProfileRoutes),
  providers: [
    ShadowProfileService,
    ShadowGithubApiAdapter,
    { provide: ShadowGithubApi, useExisting: ShadowGithubApiAdapter },
  ],
  exports: [ShadowProfileService],
})
export class ShadowProfileModule {}
