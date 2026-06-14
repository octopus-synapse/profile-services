import type { LoggerPort } from '@/shared-kernel';
import { type PushMessage, PushSenderPort } from '../../../domain/ports/push-sender.port';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Best-effort Expo push delivery (MVP). POSTs the messages to Expo's push
 * service; receipts/dead-token pruning are deferred. The fixed trusted host
 * means the global `fetch` (not SafeFetchPort) is fine here.
 */
export class ExpoPushAdapter extends PushSenderPort {
  constructor(private readonly logger: LoggerPort) {
    super();
  }

  async sendToTokens(tokens: readonly string[], message: PushMessage): Promise<void> {
    if (tokens.length === 0) return;
    const payload = tokens.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      ...(message.data ? { data: message.data } : {}),
    }));
    try {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      this.logger.warn(
        `Expo push send failed: ${err instanceof Error ? err.message : 'unknown'}`,
        'ExpoPushAdapter',
      );
    }
  }
}
