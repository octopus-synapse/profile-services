import type { ZodTypeAny, z } from 'zod';
import { DomainException, type DomainExceptionOptions } from '@/shared-kernel/exceptions';
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

/**
 * Bumped onto `DomainException` so re-throws preserve the original
 * fault (`{ cause }`) for log forensics, and so the route mounter's
 * generic exception filter maps WS validation failures to a 400 with
 * a stable `WS_VALIDATION_ERROR` code.
 */
export class WsValidationError extends DomainException {
  readonly code = 'WS_VALIDATION_ERROR';
  readonly statusHint = 400;

  constructor(
    message: string,
    public readonly issues: readonly WsValidationFieldIssue[],
    options: DomainExceptionOptions = {},
  ) {
    super(message, options);
  }
}
