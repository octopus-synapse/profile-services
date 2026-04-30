/**
 * Bridge: rxjs `Observable<SseEvent<T>>` → Bun `ReadableStream<Uint8Array>`
 * formatted as Server-Sent Events. Used by the Elysia route mounter
 * for routes declared `kind: 'sse'`.
 *
 * Each SSE event is encoded as `data: <json>\n\n` (with optional `id:`,
 * `event:`, `retry:` lines if the Observable supplies them). The stream
 * subscribes on `start` and unsubscribes on `cancel` so closed clients
 * stop the upstream cold.
 */

import type { Observable } from 'rxjs';
import type { SseEvent } from '@/shared-kernel/http/sse-stream.port';

const encoder = new TextEncoder();

function formatEvent<T>(event: SseEvent<T>): string {
  const lines: string[] = [];
  if (event.id !== undefined) lines.push(`id: ${event.id}`);
  if (event.type !== undefined) lines.push(`event: ${event.type}`);
  if (event.retry !== undefined) lines.push(`retry: ${event.retry}`);
  const payload = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
  for (const line of payload.split('\n')) lines.push(`data: ${line}`);
  return `${lines.join('\n')}\n\n`;
}

export function observableToSseStream<T>(
  source: Observable<SseEvent<T>>,
): ReadableStream<Uint8Array> {
  let subscription: { unsubscribe: () => void } | undefined;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      subscription = source.subscribe({
        next: (ev) => {
          try {
            controller.enqueue(encoder.encode(formatEvent(ev)));
          } catch {
            subscription?.unsubscribe();
          }
        },
        error: (err) => {
          controller.error(err);
        },
        complete: () => {
          controller.close();
        },
      });
    },
    cancel() {
      subscription?.unsubscribe();
    },
  });
}

export const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};
