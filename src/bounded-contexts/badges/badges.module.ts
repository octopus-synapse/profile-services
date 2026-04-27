/**
 * Badges Module
 *
 * Thin Nest shell over `buildBadgesUseCases`. All wiring lives in
 * `badges.composition.ts`; this file only adapts the bundle to Nest's
 * DI container so controllers can `constructor(private bc: BadgesUseCases)`.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { BadgesUseCases } from './application/ports/badges.port';
import { buildBadgesUseCases } from './badges.composition';
import { BadgeController } from './infrastructure/controllers/badge.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BadgeController],
  providers: [
    {
      provide: BadgesUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildBadgesUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
  ],
  exports: [BadgesUseCases],
})
export class BadgesModule {}
