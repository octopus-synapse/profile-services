import type { ConfigPort } from '@/shared-kernel/config/config.port';
import { pseudoAnonymize } from '@/shared-kernel/crypto';
import type { DomainEvent } from '@/shared-kernel/event-bus';

const MAX_STRING_LENGTH = 256;
const MAX_DEPTH = 2;

const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|email|password|secret|token|jwt|credential|coverletter|html|markdown|raw|text|content|file|document|cv|resumebody)/iu;
const ID_KEY_PATTERN = /(^id$|id$|uuid|userid|resumeid|jobid|snapshotid|sessionid|applicationid)/iu;

const LOW_CARDINALITY_KEYS = new Set([
  'eventType',
  'event_type',
  'type',
  'outcome',
  'status',
  'result',
  'format',
  'provider',
  'scoreType',
  'method',
  'route',
]);

export class TelemetrySanitizer {
  constructor(private readonly config: ConfigPort) {}

  hashIdentifier(value: string | undefined | null): string | undefined {
    if (!value) return undefined;
    return pseudoAnonymize(value, this.config);
  }

  sanitizeDomainEvent(event: DomainEvent): Record<string, unknown> {
    return {
      event_id: event.eventId,
      event_type: event.eventType,
      aggregate_hash: this.hashIdentifier(event.aggregateId),
      occurred_at: event.occurredAt.toISOString(),
      schema_version: event.schemaVersion,
      payload: this.sanitizeValue(event.payload),
    };
  }

  lowCardinalityTags(event: DomainEvent): Record<string, string> {
    const tags: Record<string, string> = {
      event_type: event.eventType,
      schema_version: String(event.schemaVersion),
    };
    if (event.payload && typeof event.payload === 'object') {
      const payload = event.payload as Record<string, unknown>;
      for (const key of LOW_CARDINALITY_KEYS) {
        const value = payload[key];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          tags[toSnakeCase(key)] = String(value);
        }
      }
    }
    return tags;
  }

  private sanitizeValue(value: unknown, depth = 0): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'string') return this.sanitizeString(value);
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return { count: value.length };
    if (typeof value !== 'object') return String(value);
    if (depth >= MAX_DEPTH) return '[object]';

    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) continue;
      if (ID_KEY_PATTERN.test(key)) {
        if (nested === null || nested === undefined) continue;
        output[`${toSnakeCase(key)}_hash`] = this.hashIdentifier(String(nested));
        continue;
      }
      output[toSnakeCase(key)] = this.sanitizeValue(nested, depth + 1);
    }
    return output;
  }

  private sanitizeString(value: string): string {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
    .replace(/[\s.-]+/gu, '_')
    .toLowerCase();
}
