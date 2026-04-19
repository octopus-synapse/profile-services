import { describe, expect, it } from 'bun:test';
import { parseUserAgent } from './parse-user-agent';

describe('parseUserAgent', () => {
  it('should classify common mobile UA as mobile', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1',
    );
    expect(result.deviceType).toBe('mobile');
    expect(result.os).toBe('iOS');
    expect(result.browser).toBe('Safari');
  });

  it('should classify Android phone as mobile', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/115.0.0.0 Mobile Safari/537.36',
    );
    expect(result.deviceType).toBe('mobile');
    expect(result.os).toBe('Android');
    expect(result.browser).toBe('Chrome');
  });

  it('should classify iPad as tablet', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1',
    );
    expect(result.deviceType).toBe('tablet');
    expect(result.os).toBe('iOS');
  });

  it('should classify desktop Chrome on macOS', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36',
    );
    expect(result.deviceType).toBe('desktop');
    expect(result.os).toBe('macOS');
    expect(result.browser).toBe('Chrome');
  });

  it('should classify desktop Firefox on Windows', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
    );
    expect(result.deviceType).toBe('desktop');
    expect(result.os).toBe('Windows');
    expect(result.browser).toBe('Firefox');
  });

  it('should classify common bots as bot', () => {
    expect(parseUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)').deviceType).toBe(
      'bot',
    );
    expect(parseUserAgent('facebookexternalhit/1.1').deviceType).toBe('bot');
    expect(parseUserAgent('Mozilla/5.0 (compatible; bingbot/2.0)').deviceType).toBe('bot');
    expect(parseUserAgent('Twitterbot/1.0').deviceType).toBe('bot');
  });

  it('should return unknown for empty or null UA', () => {
    expect(parseUserAgent('')).toEqual({ deviceType: 'unknown', os: null, browser: null });
    expect(parseUserAgent(null)).toEqual({ deviceType: 'unknown', os: null, browser: null });
    expect(parseUserAgent(undefined)).toEqual({
      deviceType: 'unknown',
      os: null,
      browser: null,
    });
  });

  it('should detect Edge browser', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36 Edg/115.0.0.0',
    );
    expect(result.browser).toBe('Edge');
  });
});
