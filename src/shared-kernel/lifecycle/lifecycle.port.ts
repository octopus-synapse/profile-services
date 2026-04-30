/**
 * Framework-free lifecycle hooks. Classes that need to run code at app
 * boot or shutdown implement this interface; the host adapter (Nest
 * today, Elysia tomorrow) calls `init()` once when the class is
 * instantiated for the first time and `dispose()` during graceful
 * shutdown.
 *
 * Replaces direct usage of `@nestjs/common`'s `OnModuleInit` /
 * `OnModuleDestroy` interfaces.
 */
export interface Lifecycle {
  init?(): Promise<void>;
  dispose?(): Promise<void>;
}
