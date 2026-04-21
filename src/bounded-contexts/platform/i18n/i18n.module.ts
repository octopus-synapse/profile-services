import { Global, Module } from '@nestjs/common';
import { I18nService } from './application/i18n.service';
import { MessageCodeRegistry } from './domain/message-code.registry';
import { TRANSLATION_PORT, TranslationPort } from './domain/translation.port';

@Global()
@Module({
  providers: [
    MessageCodeRegistry,
    I18nService,
    { provide: TranslationPort, useExisting: I18nService },
    { provide: TRANSLATION_PORT, useExisting: I18nService },
  ],
  exports: [MessageCodeRegistry, TranslationPort, TRANSLATION_PORT],
})
export class I18nModule {}
