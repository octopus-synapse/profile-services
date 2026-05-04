import type { ZodTypeAny, z } from 'zod';
import type { WsContext, WsMessageHandler } from './websocket.port';

/**
 * Q39 in the duplication audit. Wraps a `WsMessageHandler` with Zod
 * payload validation so namespaces stop manually casting `unknown`
 * payloads in every handler.
 *
 *   namespace.on('chat:send', validate(SendMessageSchema, async (ctx) => { ... }));
 */
export function validateWsMessage<TSchema extends ZodTypeAny, TReply = unknown>(
  schema: TSchema,
  handler: WsMessageHandler<z.infer<TSchema>, TReply>,
): WsMessageHandler<unknown, TReply> {
  return async (ctx: WsContext<unknown>) => {
    const parsed = schema.safeParse(ctx.payload);
    if (!parsed.success) {
      // Same shape as the HTTP error envelope's "fields" array so a
      // future ws-side error mapper can surface field-level errors.
      throw new WsValidationError(
        'Invalid WS payload',
        parsed.error.issues.map((i) => ({
          path: i.path,
          code: i.code,
          message: i.message,
        })),
      );
    }
    return handler({
      userId: ctx.userId,
      socketId: ctx.socketId,
      payload: parsed.data,
    });
  };
}

export interface WsValidationFieldIssue {
  readonly path: ReadonlyArray<string | number>;
  readonly code: string;
  readonly message: string;
}

export class WsValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: readonly WsValidationFieldIssue[],
  ) {
    super(message);
    this.name = 'WsValidationError';
  }
}
