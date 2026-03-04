import { Module } from '@nestjs/common';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SectionTypeRepository } from '@/shared-kernel/repositories/section-type.repository';
import { ATSController } from './ats.controller';
import { DateRangeExtractor, JobTitleExtractor, OrganizationExtractor } from './extractors';
import { SECTION_SEMANTIC_CATALOG } from './interfaces';
import { CVSectionParser } from './parsers/cv-section.parser';
import {
  ContentQualitySemanticPolicy,
  DuplicateSemanticPolicy,
  MandatorySemanticPolicy,
  SectionOrderSemanticPolicy,
} from './policies';
import { DefinitionDrivenScoringStrategy, SemanticScoringService } from './scoring';
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
  ],
  exports: [ATSService, ATSSectionTypeAdapter],
})
export class ATSModule {}
