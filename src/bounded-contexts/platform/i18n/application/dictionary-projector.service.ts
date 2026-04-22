/**
 * DictionaryProjectorService
 *
 * Projects the two-locale `@packages/i18n` dictionaries down to the
 * single-locale flat maps the `/v1/i18n/dictionary/*` endpoints serve.
 *
 * Lives as a service (not a helper) so the controller stays thin and the
 * dependency-rules arch test keeps loops / .map / .reduce out of controllers.
 */

import { Injectable } from '@nestjs/common';
import { ENUM_DICTIONARY, ERROR_DICTIONARY, NOTIFICATION_DICTIONARY } from '@packages/i18n';
import type { SupportedLocale } from '../domain/translation.port';

export interface ProjectedNotification {
  title: string;
  body: string;
  params: string[];
}

@Injectable()
export class DictionaryProjectorService {
  projectErrors(locale: SupportedLocale): Record<string, string> {
    return Object.fromEntries(
      Object.entries(ERROR_DICTIONARY).map(([code, entry]) => [code, entry[locale]]),
    );
  }

  projectEnums(locale: SupportedLocale): Record<string, Record<string, string>> {
    return Object.fromEntries(
      Object.entries(ENUM_DICTIONARY).map(([enumName, values]) => [
        enumName,
        Object.fromEntries(
          Object.entries(values).map(([v, entry]) => [
            v,
            (entry as { en: string; 'pt-BR': string })[locale],
          ]),
        ),
      ]),
    );
  }

  projectNotifications(locale: SupportedLocale): Record<string, ProjectedNotification> {
    return Object.fromEntries(
      Object.entries(NOTIFICATION_DICTIONARY).map(([type, tpl]) => [
        type,
        {
          title: tpl.title[locale],
          body: tpl.body[locale],
          params: [...tpl.params],
        },
      ]),
    );
  }
}
