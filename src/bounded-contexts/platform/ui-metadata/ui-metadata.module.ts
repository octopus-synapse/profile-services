import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { MeDashboardController } from './controllers/me-dashboard.controller';
import { UiMetadataController } from './controllers/ui-metadata.controller';
import { MeDashboardService } from './services/me-dashboard.service';
import { MenuService } from './services/menu.service';

@Module({
  imports: [PrismaModule],
  controllers: [UiMetadataController, MeDashboardController],
  providers: [MenuService, MeDashboardService],
})
export class UiMetadataModule {}
