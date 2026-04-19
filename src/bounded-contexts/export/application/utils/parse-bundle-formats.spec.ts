import { describe, expect, it } from 'bun:test';
import { parseBundleFormats } from './parse-bundle-formats';

describe('parseBundleFormats', () => {
  it('returns undefined when input is empty', () => {
    expect(parseBundleFormats(undefined)).toBeUndefined();
    expect(parseBundleFormats('')).toBeUndefined();
  });

  it('parses canonical comma-separated values', () => {
    expect(parseBundleFormats('pdf,docx,json')).toEqual(['pdf', 'docx', 'json']);
  });

  it('is case-insensitive and trims spaces', () => {
    expect(parseBundleFormats(' PDF , Docx ')).toEqual(['pdf', 'docx']);
  });

  it('drops unknown values', () => {
    expect(parseBundleFormats('pdf,latex,docx')).toEqual(['pdf', 'docx']);
  });

  it('returns undefined when no values survive validation', () => {
    expect(parseBundleFormats('mp4,xls')).toBeUndefined();
  });

  it('deduplicates repeated formats', () => {
    expect(parseBundleFormats('pdf,pdf,docx,pdf')).toEqual(['pdf', 'docx']);
  });
});
