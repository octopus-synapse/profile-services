/**
 * I18n Module
 *
 * Thin Nest shell: keeps the global error filter + translation port +
 * dictionary projector as Nest providers (framework-coupled), and
 * routes the dictionary use case through `i18n.composition.ts`.
 */

import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DictionaryProjectorService } from './application/dictionary-projector.service';
import { I18nService } from './application/i18n.service';
import { I18nUseCases } from './application/ports/i18n.port';
import { MessageCodeRegistry } from './domain/message-code.registry';
import { TranslationPort } from './domain/translation.port';
import { buildI18nUseCases } from './i18n.composition';
import { I18nDictionaryController } from './infrastructure/controllers/i18n-dictionary.controller';
import { DomainErrorFilter } from './infrastructure/domain-error.filter';

@Global()
@Module({
  controllers: [I18nDictionaryController],
  providers: [
    MessageCodeRegistry,
    I18nService,
    DictionaryProjectorService,
    {
      provide: I18nUseCases,
      useFactory: (projector: DictionaryProjectorService) => buildI18nUseCases(projector),
      inject: [DictionaryProjectorService],
    },
    { provide: TranslationPort, useExisting: I18nService },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
  exports: [MessageCodeRegistry, TranslationPort],
})
export class I18nModule {}
