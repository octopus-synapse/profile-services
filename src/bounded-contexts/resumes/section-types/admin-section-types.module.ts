import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@/bounded-contexts/identity/authentication';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { AdminSectionTypesController } from './admin-section-types.controller';
import { AdminSectionTypesService } from './admin-section-types.service';

@Module({
  imports: [PrismaModule, AuthenticationModule, AuthorizationModule],
  controllers: [AdminSectionTypesController],
  providers: [AdminSectionTypesService],
  exports: [AdminSectionTypesService],
})
export class AdminSectionTypesModule {}
