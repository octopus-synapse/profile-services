/**
 * ParseCuidPipe Bug Detection Tests
 *
 * Uncle Bob: "O pipe deixa IDs inválidos PASSAR!"
 *
 * BUG-036: ParseCuidPipe Allows Invalid IDs Through
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { BadRequestException } from '@nestjs/common';
import { ParseCuidPipe } from './parse-cuid.pipe';

describe('ParseCuidPipe - BUG DETECTION', () => {
  let pipe: ParseCuidPipe;

  beforeEach(() => {
    pipe = new ParseCuidPipe();
  });

  describe('BUG-036: Invalid IDs Pass Through', () => {
    /**
     * Current behavior: Invalid CUIDs are returned as-is
     * Expected: Should throw BadRequestException
     *
     * This lets invalid IDs reach services, causing:
     * - Unnecessary database queries
     * - Confusing 404 errors instead of 400
     * - Potential SQL injection if not properly handled
     */
    it('should REJECT invalid CUID format', () => {
      const invalidIds = [
        'invalid-id',
        '12345',
        'not-a-cuid',
        'too-short',
        'Cupper-case', // Uppercase
        '123456789012345678901234567890', // Too long
      ];

      for (const invalidId of invalidIds) {
        // BUG: This should throw but doesn't!
        expect(() => pipe.transform(invalidId)).toThrow(BadRequestException);
      }
    });

    it('should ACCEPT valid CUID format', () => {
      // Valid CUIDs: start with 'c', 25 chars, lowercase alphanumeric
      const validCuids = ['clh1234567890abcdefghij', 'cm3e7xyzabcdefghij12345'];

      for (const validId of validCuids) {
        expect(() => pipe.transform(validId)).not.toThrow();
        expect(pipe.transform(validId)).toBe(validId);
      }
    });

    it('should throw on SQL injection attempts', () => {
      const sqlInjection = "'; DROP TABLE users; --";

      // BUG: Currently passes through!
      expect(() => pipe.transform(sqlInjection)).toThrow(BadRequestException);
    });

    it('should throw on path traversal attempts', () => {
      const pathTraversal = '../../../etc/passwd';

      // BUG: Currently passes through!
      expect(() => pipe.transform(pathTraversal)).toThrow(BadRequestException);
    });
  });

  describe('Current Buggy Behavior (documenting)', () => {
    it('currently allows invalid IDs through (THIS IS A BUG)', () => {
      // This test documents the current buggy behavior
      const invalidId = 'not-a-valid-cuid';

      // Current behavior: returns the invalid ID
      const result = pipe.transform(invalidId);
      expect(result).toBe(invalidId);

      // This is a BUG! Should throw instead.
    });
  });
});
