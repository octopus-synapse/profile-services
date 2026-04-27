import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { uiStateRoutes } from './ui-state.routes';
import { UiStateService } from './ui-state.service';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(UiStateService, uiStateRoutes),
  providers: [UiStateService],
})
export class UiStateModule {}
