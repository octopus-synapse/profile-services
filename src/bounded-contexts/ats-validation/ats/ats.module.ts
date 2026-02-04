import { Module } from '@nestjs/common';
import { ATSController } from './ats.controller';
import { ATSService } from './services/ats.service';
import { TextExtractionService } from './services/text-extraction.service';
import { EncodingNormalizerService } from './services/encoding-normalizer.service';
import { CVSectionParser } from './parsers/cv-section.parser';
import { FileIntegrityValidator } from './validators/file-integrity.validator';
import { FormatValidator } from './validators/format.validator';
import { SectionOrderValidator } from './validators/section-order.validator';
import { LayoutSafetyValidator } from './validators/layout-safety.validator';
import { GrammarValidator } from './validators/grammar.validator';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';

@Module({
  controllers: [ATSController],
  providers: [
    ATSService,
    TextExtractionService,
    EncodingNormalizerService,
    CVSectionParser,
    FileIntegrityValidator,
    FormatValidator,
    SectionOrderValidator,
    LayoutSafetyValidator,
    GrammarValidator,
    AppLoggerService,
  ],
  exports: [ATSService],
})
export class ATSModule {}
