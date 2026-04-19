/**
 * Spoken Languages Module
 * Provides spoken language catalog for resume language selection
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SpokenLanguagesRepositoryPort } from './application/ports/spoken-languages.port';
import { SpokenLanguagesRepository } from './infrastructure/adapters/persistence/spoken-languages.repository';
import { SpokenLanguagesService } from './services/spoken-languages.service';
import { SpokenLanguagesController } from './spoken-languages.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SpokenLanguagesController],
  providers: [
    SpokenLanguagesService,
    {
      provide: SpokenLanguagesRepositoryPort,
      useFactory: (prisma: PrismaService) => new SpokenLanguagesRepository(prisma),
      inject: [PrismaService],
    },
  ],
  exports: [SpokenLanguagesService],
})
export class SpokenLanguagesModule {}
