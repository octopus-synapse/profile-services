/**
 * In-memory `AntiGhostingEmailerPort` for sweep specs. Records every
 * sent message and lets a test pin the next call to throw so the
 * "swallow transport failure, continue with the next candidate"
 * branch can be exercised.
 */

import {
  AntiGhostingEmailerPort,
  type AntiGhostingEmailMessage,
} from '../domain/ports/anti-ghosting-emailer.port';

export class InMemoryAntiGhostingEmailer extends AntiGhostingEmailerPort {
  readonly sent: AntiGhostingEmailMessage[] = [];
  private nextError: Error | null = null;

  failNextWith(error: Error): void {
    this.nextError = error;
  }

  async send(message: AntiGhostingEmailMessage): Promise<void> {
    if (this.nextError) {
      const err = this.nextError;
      this.nextError = null;
      throw err;
    }
    this.sent.push(message);
  }
}
