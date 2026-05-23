import { describe, expect, it } from 'bun:test';
import { sanitizeHtmlContent } from './sanitize-html';

describe('sanitizeHtmlContent', () => {
  it('preserves whitelisted tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtmlContent(input)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('strips <script>', () => {
    expect(sanitizeHtmlContent('<p>safe</p><script>alert(1)</script>')).toBe('<p>safe</p>');
  });

  it('strips onerror handlers', () => {
    const out = sanitizeHtmlContent('<img src=x onerror="alert(1)" />');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('alert');
  });

  it('strips <svg> entirely', () => {
    const out = sanitizeHtmlContent('<svg><script>alert(1)</script></svg>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('svg');
  });

  it('drops javascript: hrefs', () => {
    const out = sanitizeHtmlContent('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
  });

  it('keeps http/https hrefs', () => {
    const out = sanitizeHtmlContent('<a href="https://example.com">x</a>');
    expect(out).toContain('href="https://example.com"');
  });

  it('drops broken / malformed tags', () => {
    const out = sanitizeHtmlContent('<p<script>alert(1)</script>>x</p>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('</script');
  });

  it('strips ALL markup when allowedTags is empty', () => {
    expect(sanitizeHtmlContent('<p>plain <strong>only</strong></p>', { allowedTags: [] })).toBe(
      'plain only',
    );
  });

  it('handles encoded payloads safely', () => {
    const out = sanitizeHtmlContent('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).not.toContain('<script>');
  });

  it('strips iframe', () => {
    const out = sanitizeHtmlContent('<iframe src="https://evil.com"></iframe>');
    expect(out).not.toContain('iframe');
  });
});
