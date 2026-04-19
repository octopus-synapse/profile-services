/**
 * Social Event Bus Port
 *
 * Abstraction over the in-process event bus used for SSE-style updates
 * to activity feeds (`feed:user:${id}` channel).
 */

export const SOCIAL_EVENT_BUS_PORT = Symbol('SOCIAL_EVENT_BUS_PORT');

export abstract class SocialEventBusPort {
  abstract emit(eventName: string, payload: unknown): void;
}
