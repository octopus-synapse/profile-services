/**
 * Spoken Languages Module
 * Provides spoken language catalog for resume language selection
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SpokenLanguagesService } from './services/spoken-languages.service';
import { SpokenLanguagesController } from './spoken-languages.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SpokenLanguagesController],
  providers: [SpokenLanguagesService],
  exports: [SpokenLanguagesService],
})
export class SpokenLanguagesModule {}
