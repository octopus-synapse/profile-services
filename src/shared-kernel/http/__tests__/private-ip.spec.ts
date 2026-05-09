import { describe, expect, it } from 'bun:test';
import { isPrivateIp } from '../private-ip';

describe('isPrivateIp (P0-013/014)', () => {
  it('blocks RFC1918 ranges', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('172.16.5.10')).toBe(true);
    expect(isPrivateIp('192.168.1.1')).toBe(true);
  });

  it('blocks loopback + link-local + AWS metadata', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('169.254.169.254')).toBe(true); // AWS metadata
  });

  it('blocks CGNAT / TEST-NET / multicast / reserved', () => {
    expect(isPrivateIp('100.64.0.1')).toBe(true);
    expect(isPrivateIp('192.0.2.1')).toBe(true);
    expect(isPrivateIp('224.0.0.1')).toBe(true);
    expect(isPrivateIp('255.255.255.255')).toBe(true);
  });

  it('blocks IPv6 loopback / unique-local / link-local', () => {
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('fc00::1')).toBe(true);
    expect(isPrivateIp('fe80::1')).toBe(true);
  });

  it('blocks IPv4-mapped IPv6 form for blocked ranges', () => {
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
  });

  it('allows public IPs', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
  });

  it('treats unparseable inputs as blocked (fail-closed)', () => {
    expect(isPrivateIp('not-an-ip')).toBe(true);
    expect(isPrivateIp('10.0.0')).toBe(true);
    expect(isPrivateIp('256.256.256.256')).toBe(true);
  });
});
