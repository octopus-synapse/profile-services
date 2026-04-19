import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { UiStateController } from './ui-state.controller';
import { UiStateService } from './ui-state.service';

@Module({
  imports: [PrismaModule],
  controllers: [UiStateController],
  providers: [UiStateService],
})
export class UiStateModule {}
