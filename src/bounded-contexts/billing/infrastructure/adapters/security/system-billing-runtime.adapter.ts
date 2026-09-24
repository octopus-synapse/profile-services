import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { BillingClockPort, BillingIdPort } from '../../../application/ports/billing-runtime.port';

export class SystemBillingClock extends BillingClockPort {
  now(): Date {
    return new Date();
  }
}
export class SystemBillingIds extends BillingIdPort {
  id(): string {
    return randomUUID();
  }
  token(): string {
    return randomBytes(32).toString('base64url');
  }
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
