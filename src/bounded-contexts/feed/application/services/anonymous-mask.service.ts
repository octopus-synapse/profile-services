/**
 * @deprecated Anonymous posts were removed in the minimalist feed refactor.
 * This service is a no-op passthrough kept so legacy wiring still compiles
 * during the cleanup sweep — remove the class entirely once all callers
 * stop injecting it.
 */

export class AnonymousMaskService {
  /** No-op: anonymous posts no longer exist. */
  mask<T>(post: T): T {
    return post;
  }
}
