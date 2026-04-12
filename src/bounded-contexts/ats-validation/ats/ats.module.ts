import { Module } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import { CalculateThemeATSScoreUseCase } from '../application/use-cases/calculate-theme-ats-score/calculate-theme-ats-score.use-case';
import { ThemeATSAdapter } from '../infrastructure/adapters/theme-ats.adapter';
import { ATSController } from '../infrastructure/controllers/ats.controller';
import { DateRangeExtractor, JobTitleExtractor, OrganizationExtractor } from './extractors';
import { SECTION_SEMANTIC_CATALOG, THEME_ATS_PORT } from './interfaces';
import { CVSectionParser } from './parsers/cv-section.parser';
import {
  ContentQualitySemanticPolicy,
  DuplicateSemanticPolicy,
  MandatorySemanticPolicy,
  SectionOrderSemanticPolicy,
} from './policies';
import {
  DefinitionDrivenScoringStrategy,
  SemanticScoringService,
  ThemeATSScoringStrategy,
} from './scoring';
import { ATSService } from './services/ats.service';
import { ATSSectionTypeAdapter } from './services/ats-section-type.adapter';
import { EncodingNormalizerService } from './services/encoding-normalizer.service';
import { SectionSemanticCatalogAdapter } from './services/section-semantic-catalog.adapter';
import { TextExtractionService } from './services/text-extraction.service';
import { FileIntegrityValidator } from './validators/file-integrity.validator';
import { FormatValidator } from './validators/format.validator';
import { GrammarValidator } from './validators/grammar.validator';
import { LayoutSafetyValidator } from './validators/layout-safety.validator';
import { SectionOrderValidator } from './validators/section-order.validator';

@Module({
  imports: [PrismaModule],
  controllers: [ATSController],
  providers: [
    // Shared-kernel dependency
    SectionTypeRepository,
    // ATS Definition-driven adapter
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
    {
      provide: SECTION_SEMANTIC_CATALOG,
      useExisting: SectionSemanticCatalogAdapter,
    },
    // Theme ATS Scoring
    ThemeATSScoringStrategy,
    ThemeATSAdapter,
    { provide: THEME_ATS_PORT, useExisting: ThemeATSAdapter },
    CalculateThemeATSScoreUseCase,
  ],
  exports: [ATSService, ATSSectionTypeAdapter, CalculateThemeATSScoreUseCase],
})
export class ATSModule {}
