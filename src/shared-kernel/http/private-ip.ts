/**
 * Audit of private / link-local / loopback / reserved IP ranges that
 * MUST NOT be reachable through user-supplied URLs (P0-013/014). Kept
 * in a single file so the SSRF allow/block surface is visible at a
 * glance rather than scattered across adapters.
 *
 * Blocks IPv4:
 *   - 0.0.0.0/8         (current network — software bug surface)
 *   - 10.0.0.0/8        RFC1918 private
 *   - 100.64.0.0/10     CGNAT
 *   - 127.0.0.0/8       loopback
 *   - 169.254.0.0/16    link-local (AWS/GCP metadata 169.254.169.254 lives here)
 *   - 172.16.0.0/12     RFC1918 private
 *   - 192.0.0.0/24      IETF protocol assignments
 *   - 192.0.2.0/24      TEST-NET-1
 *   - 192.168.0.0/16    RFC1918 private
 *   - 198.18.0.0/15     benchmark testing
 *   - 198.51.100.0/24   TEST-NET-2
 *   - 203.0.113.0/24    TEST-NET-3
 *   - 224.0.0.0/4       multicast
 *   - 240.0.0.0/4       reserved
 *   - 255.255.255.255   limited broadcast
 *
 * Blocks IPv6:
 *   - ::                unspecified
 *   - ::1               loopback
 *   - ::ffff:*          IPv4-mapped (mirrors all blocked v4 ranges via
 *                       a fall-through to the v4 check)
 *   - fc00::/7          unique local
 *   - fe80::/10         link-local
 *   - ff00::/8          multicast
 *   - 64:ff9b::/96      well-known NAT64 prefix (resolves to v4 — also
 *                       falls through to v4 check)
 */

interface CidrV4 {
  readonly network: number;
  readonly mask: number;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}

function cidrV4(prefix: string, bits: number): CidrV4 {
  const network = ipv4ToInt(prefix);
  if (network === null) throw new Error(`invalid CIDR: ${prefix}/${bits}`);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  // `>>> 0` keeps the result unsigned — JS bitwise AND returns a
  // signed 32-bit number, which would make the equality check below
  // (`(n & mask) >>> 0 === network`) fail for any range whose high
  // bit is set (10.x, 127.x, 169.254.x, 192.168.x, …).
  return { network: (network & mask) >>> 0, mask };
}

const BLOCKED_V4: ReadonlyArray<CidrV4> = [
  cidrV4('0.0.0.0', 8),
  cidrV4('10.0.0.0', 8),
  cidrV4('100.64.0.0', 10),
  cidrV4('127.0.0.0', 8),
  cidrV4('169.254.0.0', 16),
  cidrV4('172.16.0.0', 12),
  cidrV4('192.0.0.0', 24),
  cidrV4('192.0.2.0', 24),
  cidrV4('192.168.0.0', 16),
  cidrV4('198.18.0.0', 15),
  cidrV4('198.51.100.0', 24),
  cidrV4('203.0.113.0', 24),
  cidrV4('224.0.0.0', 4),
  cidrV4('240.0.0.0', 4),
];

function isBlockedV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable = unsafe
  if (n === 0xffffffff) return true; // 255.255.255.255
  return BLOCKED_V4.some(({ network, mask }) => (n & mask) >>> 0 === network);
}

// IPv6 helpers — string-prefix tests are good enough for the small set
// of ranges we block. IPs are normalized to lowercase before testing.
function normalizeV6(ip: string): string {
  return ip.toLowerCase();
}

function isMappedV4(ip: string): string | null {
  // ::ffff:a.b.c.d  or  ::ffff:0:a.b.c.d  or  ::ffff:hex:hex
  const m = ip.match(/^::ffff:(?:0:)?([0-9a-f.]+)$/i);
  if (!m) return null;
  const inner = m[1];
  if (inner.includes('.')) return inner;
  // hex form — convert two 16-bit groups to 4 octets.
  const groups = inner.split(':');
  if (groups.length !== 2) return null;
  const left = parseInt(groups[0], 16);
  const right = parseInt(groups[1], 16);
  if (Number.isNaN(left) || Number.isNaN(right)) return null;
  return `${(left >> 8) & 0xff}.${left & 0xff}.${(right >> 8) & 0xff}.${right & 0xff}`;
}

function isBlockedV6(ip: string): boolean {
  const v = normalizeV6(ip);
  if (v === '::' || v === '::1') return true;
  if (v.startsWith('ff')) return true; // ff00::/8 multicast
  if (v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) {
    return true; // fe80::/10 link-local
  }
  // fc00::/7  → first byte 1111110x → fc.. or fd..
  if (v.startsWith('fc') || v.startsWith('fd')) return true;
  // 64:ff9b::/96 well-known NAT64 — embeds v4; just check prefix.
  if (v.startsWith('64:ff9b:')) return true;
  // IPv4-mapped form fall-through.
  const mapped = isMappedV4(v);
  if (mapped !== null) return isBlockedV4(mapped);
  return false;
}

/**
 * Returns true if the given IP literal must NOT be reached from the
 * application (loopback, private, link-local, multicast, reserved, etc.)
 *
 * Accepts both v4 (`a.b.c.d`) and v6 forms. Anything unparseable is
 * treated as blocked — fail-closed.
 */
export function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) return isBlockedV6(ip);
  return isBlockedV4(ip);
}
