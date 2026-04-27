/**
 * I18n Module
 *
 * ADR-001: the dictionary controller now goes through
 * `GetDictionaryUseCase`, which is a POJO that wraps
 * `DictionaryProjectorService`. The translation port + global error
 * filter remain provided here as before.
 */

import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DictionaryProjectorService } from './application/dictionary-projector.service';
import { I18nService } from './application/i18n.service';
import { GetDictionaryUseCase } from './application/use-cases/get-dictionary/get-dictionary.use-case';
import { MessageCodeRegistry } from './domain/message-code.registry';
import { TranslationPort } from './domain/translation.port';
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
      provide: GetDictionaryUseCase,
      useFactory: (projector: DictionaryProjectorService) => new GetDictionaryUseCase(projector),
      inject: [DictionaryProjectorService],
    },
    { provide: TranslationPort, useExisting: I18nService },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
  exports: [MessageCodeRegistry, TranslationPort],
})
export class I18nModule {}
