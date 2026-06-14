export interface PushMessage {
  readonly title: string;
  readonly body: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Sends push notifications to a set of device tokens. Best-effort: callers
 *  treat failures as non-fatal (a missed push must never block state). */
export abstract class PushSenderPort {
  abstract sendToTokens(tokens: readonly string[], message: PushMessage): Promise<void>;
}
