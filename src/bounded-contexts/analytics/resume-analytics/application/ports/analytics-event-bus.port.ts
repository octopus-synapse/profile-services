/**
 * Analytics Event Bus Port
 *
 * Abstraction over the in-process event bus used to push SSE-style updates
 * (view counts, ATS scores) to the analytics channel.
 */

export abstract class AnalyticsEventBusPort {
  abstract emit(eventName: string, payload: unknown): void;
}
