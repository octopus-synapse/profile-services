/**
 * DSL Module
 * Handles Resume DSL validation, compilation, and transformation
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { DslController } from './dsl.controller';
import { DslRepository } from './dsl.repository';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { DslMigrationService, DslV1ToV2Migrator } from './migrators';
import { TokenResolverService } from './token-resolver.service';

@Module({
  imports: [PrismaModule],
  controllers: [DslController],
  providers: [
    DslCompilerService,
    DslValidatorService,
    TokenResolverService,
    DslRepository,
    DslMigrationService,
    DslV1ToV2Migrator,
  ],
  exports: [DslCompilerService, DslValidatorService, DslRepository, DslMigrationService],
})
export class DslModule {}
