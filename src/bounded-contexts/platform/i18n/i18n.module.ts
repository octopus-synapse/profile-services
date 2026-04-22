import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DictionaryProjectorService } from './application/dictionary-projector.service';
import { I18nService } from './application/i18n.service';
import { MessageCodeRegistry } from './domain/message-code.registry';
import { TRANSLATION_PORT, TranslationPort } from './domain/translation.port';
import { DomainErrorFilter } from './infrastructure/domain-error.filter';
import { I18nDictionaryController } from './presentation/i18n-dictionary.controller';

@Global()
@Module({
  controllers: [I18nDictionaryController],
  providers: [
    MessageCodeRegistry,
    I18nService,
    DictionaryProjectorService,
    { provide: TranslationPort, useExisting: I18nService },
    { provide: TRANSLATION_PORT, useExisting: I18nService },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
  exports: [MessageCodeRegistry, TranslationPort, TRANSLATION_PORT],
})
export class I18nModule {}
