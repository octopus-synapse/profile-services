import { describe, expect, it } from 'bun:test';
import { HashtagParserService } from './hashtag-parser.service';

const svc = new HashtagParserService();

describe('HashtagParserService', () => {
  it('returns empty for null/undefined/empty content', () => {
    expect(svc.parse(null)).toEqual([]);
    expect(svc.parse(undefined)).toEqual([]);
    expect(svc.parse('')).toEqual([]);
  });

  it('extracts hashtags lowercased', () => {
    expect(svc.parse('Hello #World and #DevTools')).toEqual(['#world', '#devtools']);
  });

  it('dedupes case-insensitively', () => {
    expect(svc.parse('#tag #TAG #Tag')).toEqual(['#tag']);
  });

  it('returns empty for content with no hashtags', () => {
    expect(svc.parse('plain text')).toEqual([]);
  });
});
