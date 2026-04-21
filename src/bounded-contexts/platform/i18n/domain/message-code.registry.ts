/**
 * Message Code Registry
 *
 * Single source of truth for every user-facing message code the backend may
 * emit in a response, a worker-generated e-mail, or an in-app notification.
 *
 * Populated at bootstrap via discovery (phase 2+) and consumed by:
 *   - The catalog parity test (errors.pt-BR has every registered error code).
 *   - The exception filter (asserts the code exists before serialization).
 *   - The /v1/i18n/dictionary/* endpoints (only emits registered codes).
 *
 * Phase 1 only ships the structure; the registration calls come later.
 */

import { Injectable } from '@nestjs/common';

export type MessageBucket = 'errors' | 'validation' | 'notifications';

@Injectable()
export class MessageCodeRegistry {
  private readonly errors = new Set<string>();
  private readonly validation = new Set<string>();
  private readonly notifications = new Set<string>();
  private readonly enums = new Map<string, Set<string>>();

  register(bucket: MessageBucket, code: string): void {
    this[bucket].add(code);
  }

  registerEnumValue(enumName: string, value: string): void {
    let set = this.enums.get(enumName);
    if (!set) {
      set = new Set<string>();
      this.enums.set(enumName, set);
    }
    set.add(value);
  }

  has(bucket: MessageBucket, code: string): boolean {
    return this[bucket].has(code);
  }

  hasEnumValue(enumName: string, value: string): boolean {
    return this.enums.get(enumName)?.has(value) ?? false;
  }

  all(): {
    errors: string[];
    validation: string[];
    notifications: string[];
    enums: Record<string, string[]>;
  } {
    const enums: Record<string, string[]> = {};
    for (const [name, values] of this.enums) {
      enums[name] = [...values].sort();
    }
    return {
      errors: [...this.errors].sort(),
      validation: [...this.validation].sort(),
      notifications: [...this.notifications].sort(),
      enums,
    };
  }

  size(): number {
    let total = this.errors.size + this.validation.size + this.notifications.size;
    for (const set of this.enums.values()) total += set.size;
    return total;
  }
}
