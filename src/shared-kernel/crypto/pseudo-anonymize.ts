import { createHash, createHmac } from 'node:crypto';
import type { ConfigPort } from '../config/config.port';

const IPV4_OCTET_COUNT = 4;
const IPV4_RETAINED_OCTETS = 3;
const IPV6_GROUP_COUNT = 8;
const IPV6_RETAINED_GROUPS = 3;

/**
 * HMAC-SHA256 pseudo-anonymization for PII values used in analytics
 * (IP addresses, identifiers correlated with a user). Returns a stable
 * 64-char hex digest keyed on `IP_HASH_SALT` from `config.env`.
 *
 * When the salt is absent (dev / preview without secret provisioning),
 * the value falls back to a coarsened truncation: `/24` for IPv4, `/48`
 * for IPv6. Raw `sha256(ip)` was P1 #20 — without a salt the digest is
 * still reversible by a rainbow-table attack across the full v4 space
 * (2^32 inputs), so the bare SHA-256 fallback was treated as PII.
 */
export function pseudoAnonymize(value: string, config: ConfigPort): string {
  const salt = config.env.IP_HASH_SALT;
  if (salt) {
    return createHmac('sha256', salt).update(value).digest('hex');
  }
  return fallbackTruncate(value);
}

function fallbackTruncate(value: string): string {
  if (value.includes(':')) {
    const groups = value.split(':');
    if (groups.length >= IPV6_RETAINED_GROUPS) {
      const retained = groups.slice(0, IPV6_RETAINED_GROUPS).join(':');
      const padded = retained.padEnd(
        IPV6_GROUP_COUNT * 5 - (IPV6_GROUP_COUNT - IPV6_RETAINED_GROUPS),
        '0',
      );
      return createHash('sha256').update(`v6:${padded}::`).digest('hex');
    }
  }
  if (value.includes('.')) {
    const octets = value.split('.');
    if (octets.length === IPV4_OCTET_COUNT) {
      const retained = octets.slice(0, IPV4_RETAINED_OCTETS).join('.');
      return createHash('sha256').update(`v4:${retained}.0`).digest('hex');
    }
  }
  return createHash('sha256').update(`raw:${value}`).digest('hex');
}
