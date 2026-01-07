/**
 * DSL Validator Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DslValidatorService } from './dsl-validator.service';

describe('DslValidatorService', () => {
  let service: DslValidatorService;

  const validDsl = {
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'normal',
      pageBreakBehavior: 'section-aware',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'inter', body: 'inter' },
        fontSize: 'base',
        headingStyle: 'bold',
      },
      colors: {
        colors: {
          primary: '#3B82F6',
          secondary: '#64748B',
          background: '#FFFFFF',
          surface: '#F8FAFC',
          text: { primary: '#1E293B', secondary: '#64748B', accent: '#3B82F6' },
          border: '#E2E8F0',
          divider: '#F1F5F9',
        },
        borderRadius: 'md',
        shadows: 'subtle',
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'lg',
        itemGap: 'md',
        contentPadding: 'md',
      },
    },
    sections: [{ id: 'summary', visible: true, order: 0, column: 'main' }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DslValidatorService],
    }).compile();

    service = module.get<DslValidatorService>(DslValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    it('should return valid for correct DSL', () => {
      const result = service.validate(validDsl);
      expect(result.valid).toBe(true);
      expect(result.normalized).toBeDefined();
    });

    it('should return invalid for missing version', () => {
      const { version: _version, ...invalidDsl } = validDsl;
      const result = service.validate(invalidDsl);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('version: Required');
    });

    it('should return invalid for wrong layout type', () => {
      const invalidDsl = {
        ...validDsl,
        layout: { ...validDsl.layout, type: 'invalid-type' },
      };
      const result = service.validate(invalidDsl);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for wrong paper size', () => {
      const invalidDsl = {
        ...validDsl,
        layout: { ...validDsl.layout, paperSize: 'b5' },
      };
      const result = service.validate(invalidDsl);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for missing sections', () => {
      const { sections: _sections, ...invalidDsl } = validDsl;
      const result = service.validate(invalidDsl);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for malformed section', () => {
      const invalidDsl = {
        ...validDsl,
        sections: [{ id: 'test' }], // Missing visible, order, column
      };
      const result = service.validate(invalidDsl);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateOrThrow', () => {
    it('should return normalized DSL for valid input', () => {
      const normalized = service.validateOrThrow(validDsl);
      expect(normalized).toBeDefined();
      expect(normalized.version).toBe('1.0.0');
    });

    it('should throw BadRequestException for invalid input', () => {
      const invalidDsl = { invalid: true };
      expect(() => service.validateOrThrow(invalidDsl)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('isSupportedVersion', () => {
    it('should return true for supported version', () => {
      expect(service.isSupportedVersion('1.0.0')).toBe(true);
    });

    it('should return false for unsupported version', () => {
      expect(service.isSupportedVersion('2.0.0')).toBe(false);
    });
  });
});
