/**
 * ATS Validation Module
 *
 * ADR-001: Flat Hexagonal Architecture.
 * Multi-stage CV validation pipeline with definition-driven scoring.
 */

import { Module } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/shared-kernel/infrastructure/repositories';

// Application (orchestrator)
import { ATSService } from './application/use-cases/ats.service';
import { ATSSectionTypeAdapter } from './application/use-cases/ats-section-type.adapter';
import { CalculateThemeATSScoreUseCase } from './application/use-cases/calculate-theme-ats-score/calculate-theme-ats-score.use-case';
// Domain (pure logic, interfaces)
import { SECTION_SEMANTIC_CATALOG } from './domain/interfaces';
import { THEME_ATS_PORT } from './ats/interfaces';
import {
  ContentQualitySemanticPolicy,
  DuplicateSemanticPolicy,
  MandatorySemanticPolicy,
  SectionOrderSemanticPolicy,
} from './domain/services/policies';
import { DefinitionDrivenScoringStrategy, SemanticScoringService } from './domain/services/scoring';
import { ThemeATSScoringStrategy } from './ats/scoring/theme-ats-scoring.strategy';
// Infrastructure
import { ThemeATSAdapter } from './infrastructure/adapters/theme-ats.adapter';
import { EncodingNormalizerService } from './infrastructure/adapters/external-services/encoding-normalizer.service';
import { SectionSemanticCatalogAdapter } from './infrastructure/adapters/external-services/section-semantic-catalog.adapter';
import { TextExtractionService } from './infrastructure/adapters/external-services/text-extraction.service';
import { ATSController } from './infrastructure/controllers/ats.controller';
import {
  DateRangeExtractor,
  JobTitleExtractor,
  OrganizationExtractor,
} from './infrastructure/extractors';
import { CVSectionParser } from './infrastructure/parsers/cv-section.parser';
import { FileIntegrityValidator } from './infrastructure/validators/file-integrity.validator';
import { FormatValidator } from './infrastructure/validators/format.validator';
import { GrammarValidator } from './infrastructure/validators/grammar.validator';
import { LayoutSafetyValidator } from './infrastructure/validators/layout-safety.validator';
import { SectionOrderValidator } from './infrastructure/validators/section-order.validator';

@Module({
  imports: [PrismaModule],
  controllers: [ATSController],
  providers: [
    SectionTypeRepository,
    ATSSectionTypeAdapter,
    ATSService,
    TextExtractionService,
    EncodingNormalizerService,
    CVSectionParser,
    FileIntegrityValidator,
    FormatValidator,
    SectionOrderValidator,
    LayoutSafetyValidator,
    GrammarValidator,
    MandatorySemanticPolicy,
    SectionOrderSemanticPolicy,
    ContentQualitySemanticPolicy,
    DuplicateSemanticPolicy,
    DateRangeExtractor,
    OrganizationExtractor,
    JobTitleExtractor,
    DefinitionDrivenScoringStrategy,
    SemanticScoringService,
    AppLoggerService,
    SectionSemanticCatalogAdapter,
    { provide: SECTION_SEMANTIC_CATALOG, useExisting: SectionSemanticCatalogAdapter },
    // Theme ATS Scoring
    ThemeATSScoringStrategy,
    ThemeATSAdapter,
    { provide: THEME_ATS_PORT, useExisting: ThemeATSAdapter },
    CalculateThemeATSScoreUseCase,
  ],
  exports: [ATSService, ATSSectionTypeAdapter, CalculateThemeATSScoreUseCase],
})
export class ATSValidationModule {}
