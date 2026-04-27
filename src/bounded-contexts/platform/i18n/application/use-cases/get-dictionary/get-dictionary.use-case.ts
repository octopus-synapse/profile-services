/**
 * Returns one of the three i18n dictionaries (errors / enums /
 * notifications) projected to a single locale. The use case wraps
 * `DictionaryProjectorService` so the controller stays as a one-liner
 * and the negotiation/headers concern stays at the HTTP edge.
 *
 * Each public endpoint binds to one of the `dictionary` kinds, so the
 * payload type is a discriminated union on `kind`.
 */

import type { SupportedLocale } from '../../../domain/translation.port';
import {
  DictionaryProjectorService,
  type ProjectedNotification,
} from '../../dictionary-projector.service';

export type DictionaryKind = 'errors' | 'enums' | 'notifications';

export type DictionaryPayload =
  | { kind: 'errors'; entries: Record<string, string> }
  | { kind: 'enums'; entries: Record<string, Record<string, string>> }
  | { kind: 'notifications'; entries: Record<string, ProjectedNotification> };

export class GetDictionaryUseCase {
  constructor(private readonly projector: DictionaryProjectorService) {}

  execute(kind: DictionaryKind, locale: SupportedLocale): DictionaryPayload {
    switch (kind) {
      case 'errors':
        return { kind, entries: this.projector.projectErrors(locale) };
      case 'enums':
        return { kind, entries: this.projector.projectEnums(locale) };
      case 'notifications':
        return { kind, entries: this.projector.projectNotifications(locale) };
    }
  }
}
