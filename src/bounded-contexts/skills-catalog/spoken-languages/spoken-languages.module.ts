/**
 * Spoken Languages Module
 * Provides spoken language catalog for resume language selection
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SpokenLanguagesController } from './spoken-languages.controller';
import { SpokenLanguagesService } from './services/spoken-languages.service';

@Module({
  imports: [PrismaModule],
  controllers: [SpokenLanguagesController],
  providers: [SpokenLanguagesService],
  exports: [SpokenLanguagesService],
})
export class SpokenLanguagesModule {}
