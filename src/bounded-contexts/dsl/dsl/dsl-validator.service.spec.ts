/**
 * DSL Validator Service Unit Tests
 *
 * Tests for DSL validation using Zod schemas.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Test boundary conditions"
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { DslValidatorService } from './dsl-validator.service';
import { BadRequestException } from '@nestjs/common';

describe('DslValidatorService', () => {
  let service: DslValidatorService;

  beforeEach(() => {
    service = new DslValidatorService();
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should return validation result with valid property', () => {
      const result = service.validate({ invalid: 'data' });
      expect(result).toHaveProperty('valid');
    });

    it('should return valid false for invalid DSL', () => {
      const result = service.validate(null);
      expect(result.valid).toBe(false);
    });

    it('should return valid false for empty object', () => {
      const result = service.validate({});
      expect(result.valid).toBe(false);
    });

    it('should include errors array for invalid input', () => {
      const result = service.validate({ invalid: 'data' });
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('validateOrThrow', () => {
    it('should throw BadRequestException for null input', () => {
      expect(() => service.validateOrThrow(null)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid structure', () => {
      expect(() => service.validateOrThrow({ invalid: 'data' })).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing required fields', () => {
      expect(() => service.validateOrThrow({ version: '1.0.0' })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('method signatures', () => {
    it('validate should be callable', () => {
      expect(typeof service.validate).toBe('function');
    });

    it('validateOrThrow should be callable', () => {
      expect(typeof service.validateOrThrow).toBe('function');
    });
  });
});
