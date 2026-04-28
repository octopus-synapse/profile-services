import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { Lifecycle } from '@/shared-kernel/lifecycle';

/**
 * Decorates a POJO `Lifecycle`-implementing class with Nest's
 * `OnModuleInit` / `OnModuleDestroy` interfaces by delegating to its
 * `init` / `dispose` methods. Use as a mixin when the BC's class
 * doesn't want to import `@nestjs/common`.
 *
 * In practice, classes just `implements Lifecycle` and the host's
 * adapter wires the calls. The Nest adapter does that wiring by
 * synthesizing wrapper providers — most classes don't need this mixin
 * directly.
 */
export function withNestLifecycle<TBase extends abstract new (...args: never[]) => Lifecycle>(
  Base: TBase,
): TBase & {
  new (...args: ConstructorParameters<TBase>): InstanceType<TBase> & OnModuleInit & OnModuleDestroy;
} {
  abstract class WithLifecycle extends (Base as unknown as { new (...args: never[]): Lifecycle }) {
    async onModuleInit(): Promise<void> {
      await this.init?.();
    }
    async onModuleDestroy(): Promise<void> {
      await this.dispose?.();
    }
  }
  return WithLifecycle as unknown as TBase & {
    new (
      ...args: ConstructorParameters<TBase>
    ): InstanceType<TBase> & OnModuleInit & OnModuleDestroy;
  };
}
