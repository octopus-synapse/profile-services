/**
 * DSL Module
 * Handles Resume DSL validation, compilation, and transformation
 */

import { Module } from '@nestjs/common';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { TokenResolverService } from './token-resolver.service';
import { DslController } from './dsl.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DslController],
  providers: [DslCompilerService, DslValidatorService, TokenResolverService],
  exports: [DslCompilerService, DslValidatorService],
})
export class DslModule {}
