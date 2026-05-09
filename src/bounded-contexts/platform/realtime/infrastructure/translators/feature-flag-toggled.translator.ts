/**
 * Sample translator — proves the pattern. When an admin toggles a
 * feature flag, every connected client gets a global broadcast on
 * `feature-flags:global` instructing the React Query cache to drop
 * the active-flags snapshot and a transient toast confirming the
 * change.
 *
 * The remaining 12 domain-event translators follow exactly this
 * shape: declare `eventType = SomeEvent.EVENT_TYPE`, return one or
 * more `(topic, effects)` pairs.
 */

import { FeatureFlagToggledEvent } from '@/bounded-contexts/platform/feature-flags/domain/events/feature-flag-toggled.event';
import {
  EffectTranslator,
  type TranslatedEvent,
} from '../../application/ports/effect-translator.port';
import { FEATURE_FLAGS_GLOBAL_TOPIC } from '../../domain/topic';

export class FeatureFlagToggledTranslator extends EffectTranslator<FeatureFlagToggledEvent> {
  readonly eventType = FeatureFlagToggledEvent.EVENT_TYPE;

  translate(event: FeatureFlagToggledEvent): TranslatedEvent[] {
    const { key, after } = event.payload;
    const verb = after.enabled ? 'enabled' : 'disabled';
    return [
      {
        topic: FEATURE_FLAGS_GLOBAL_TOPIC,
        effects: [
          { kind: 'invalidate-query', queryKey: ['feature-flags', 'active'] },
          {
            kind: 'toast',
            message: `Feature flag "${key}" ${verb}`,
            severity: 'toast',
          },
        ],
      },
    ];
  }
}
