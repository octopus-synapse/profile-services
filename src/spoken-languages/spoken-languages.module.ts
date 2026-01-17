/**
 * Spoken Languages Module
 * Provides spoken language catalog for resume language selection
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SpokenLanguagesController } from './spoken-languages.controller';
import { SpokenLanguagesService } from './services/spoken-languages.service';
import { SpokenLanguagesRepository } from './repositories';

@Module({
  imports: [PrismaModule],
  controllers: [SpokenLanguagesController],
  providers: [SpokenLanguagesService, SpokenLanguagesRepository],
  exports: [SpokenLanguagesService],
})
export class SpokenLanguagesModule {}
