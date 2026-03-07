/**
 * CV Section Parser ReDoS Bug Detection Tests
 *
 * BUG-064: ATS Parser ReDoS Vulnerability
 *
 * Regular Expression Denial of Service (ReDoS) can cause
 * catastrophic backtracking on crafted input.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ATSSectionTypeAdapter,
  SectionDetectionPattern,
} from '../services/ats-section-type.adapter';
import { CVSectionParser } from './cv-section.parser';

/**
 * Create a mock ATSSectionTypeAdapter for ReDoS testing
 */
function createMockATSSectionTypeAdapter(): ATSSectionTypeAdapter {
  const patterns: SectionDetectionPattern[] = [
    {
      semanticKind: 'experience',
      sectionTypeKey: 'experience',
      keywords: ['experience', 'employment', 'work'],
      multiWord: ['work experience', 'professional experience'],
      isMandatory: true,
      recommendedPosition: 3,
    },
    {
      semanticKind: 'education',
      sectionTypeKey: 'education',
      keywords: ['education', 'academic'],
      multiWord: ['educational background'],
      isMandatory: true,
      recommendedPosition: 4,
    },
    {
      semanticKind: 'skills',
      sectionTypeKey: 'skills',
      keywords: ['skills', 'competencies'],
      multiWord: ['technical skills'],
      isMandatory: true,
      recommendedPosition: 5,
    },
  ];

  return {
    getDetectionPatterns: () => patterns,
    getMandatorySectionTypes: () => patterns.filter((p) => p.isMandatory),
    getPatternsByPosition: () =>
      [...patterns].sort((a, b) => a.recommendedPosition - b.recommendedPosition),
    detectSectionType: (headerText: string) => {
      const normalizedHeader = headerText.toLowerCase().trim();
      if (normalizedHeader.length < 3 || normalizedHeader.split(/\s+/).length > 5) {
        return null;
      }
      for (const pattern of patterns) {
        if (pattern.multiWord.some((p) => normalizedHeader === p.toLowerCase())) {
          return { pattern, confidence: 1.0 };
        }
        if (pattern.keywords.some((k) => normalizedHeader.includes(k.toLowerCase()))) {
          return { pattern, confidence: 0.8 };
        }
      }
      return null;
    },
    clearCache: () => {},
  } as ATSSectionTypeAdapter;
}

describe('CVSectionParser - ReDoS BUG DETECTION', () => {
  let parser: CVSectionParser;

  beforeEach(() => {
    const mockAdapter = createMockATSSectionTypeAdapter();
    parser = new CVSectionParser(mockAdapter);
  });

  describe('BUG-064: ReDoS Vulnerability', () => {
    /**
     * Vulnerable regex patterns can hang on crafted input.
     * Example: /^(a+)+$/ with 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaax'
     */
    it('should not hang on repeated section headers', async () => {
      // Craft input with many potential section matches
      const maliciousInput = `${'EXPERIENCE '.repeat(1000)}\n${'a'.repeat(10000)}`;

      const startTime = Date.now();

      // BUG: This could hang indefinitely!
      await Promise.race([
        Promise.resolve(parser.parseCV(maliciousInput, 'cv.txt', 'text/plain')),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT - Possible ReDoS!')), 1000),
        ),
      ]);

      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000);
    });

    it('should not hang on nested special characters', async () => {
      // Patterns like (.*?)* are vulnerable
      const maliciousInput = `(${'x'.repeat(30)}${')'.repeat(10)}`;

      const startTime = Date.now();

      await Promise.race([
        Promise.resolve(parser.parseCV(maliciousInput, 'cv.txt', 'text/plain')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 1000)),
      ]);

      expect(Date.now() - startTime).toBeLessThan(1000);
    });

    it('should not hang on overlapping patterns', async () => {
      // Long strings of characters that match multiple patterns
      const maliciousInput = 'a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]a]';

      const startTime = Date.now();

      await Promise.race([
        Promise.resolve(parser.parseCV(maliciousInput, 'cv.txt', 'text/plain')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 1000)),
      ]);

      expect(Date.now() - startTime).toBeLessThan(1000);
    });

    it('should limit input size', () => {
      const _hugeInput = 'x'.repeat(10_000_000); // 10MB

      // BUG: No input size limit!
      // Should reject or truncate excessively large inputs
    });
  });
});
