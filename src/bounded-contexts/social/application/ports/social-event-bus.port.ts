/**
 * Social Event Bus Port
 *
 * Abstraction over the in-process event bus used for SSE-style updates
 * to activity feeds (`feed:user:${ id }` channel).
 */

export abstract class SocialEventBusPort {
  abstract emit(eventName: string, payload: unknown): void;
}
