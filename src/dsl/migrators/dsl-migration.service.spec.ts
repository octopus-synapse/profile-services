/**
 * DSL Migration Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DslMigrationService } from './dsl-migration.service';
import type { DslMigrator } from './base.migrator';
import type { ResumeDsl } from '@octopus-synapse/profile-contracts';

describe('DslMigrationService', () => {
  let service: DslMigrationService;

  const mockDslV1: ResumeDsl = {
    version: '1.0.0',
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'normal',
      pageBreakBehavior: 'auto',
    },
    tokens: {
      colors: {
        colors: {
          primary: '#0066cc',
          secondary: '#666666',
          background: '#ffffff',
          surface: '#f9fafb',
          text: { primary: '#1a1a1a', secondary: '#666666', accent: '#0066cc' },
          border: '#e5e7eb',
          divider: '#e5e7eb',
        },
        borderRadius: 'sm',
        shadows: 'none',
      },
      typography: {
        fontFamily: { heading: 'inter', body: 'inter' },
        fontSize: 'base',
        headingStyle: 'bold',
      },
      spacing: {
        density: 'comfortable',
        sectionGap: 'md',
        itemGap: 'sm',
        contentPadding: 'md',
      },
    },
    sections: [],
  };

  const mockMigratorV1toV2: DslMigrator = {
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
    migrate: (dsl: ResumeDsl): ResumeDsl => ({
      ...dsl,
      version: '2.0.0',
    }),
  };

  const mockMigratorV2toV3: DslMigrator = {
    fromVersion: '2.0.0',
    toVersion: '3.0.0',
    migrate: (dsl: ResumeDsl): ResumeDsl => ({
      ...dsl,
      version: '3.0.0',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DslMigrationService],
    }).compile();

    service = module.get<DslMigrationService>(DslMigrationService);
  });

  describe('registerMigrators', () => {
    it('should register migrators', () => {
      service.registerMigrators([mockMigratorV1toV2]);
      expect(service.canMigrate('1.0.0', '2.0.0')).toBe(true);
    });
  });

  describe('migrate', () => {
    beforeEach(() => {
      service.registerMigrators([mockMigratorV1toV2]);
    });

    it('should return same DSL if already at target version', () => {
      const result = service.migrate(mockDslV1, '1.0.0');
      expect(result).toEqual(mockDslV1);
    });

    it('should migrate to next version', () => {
      const result = service.migrate(mockDslV1, '2.0.0');
      expect(result.version).toBe('2.0.0');
      expect((result.layout as any).pageBreakBehavior).toBe('auto');
    });

    it('should throw if no migrator found', () => {
      expect(() => service.migrate(mockDslV1, '3.0.0')).toThrow(
        BadRequestException,
      );
    });

    it('should apply migration chain', () => {
      service.registerMigrators([mockMigratorV1toV2, mockMigratorV2toV3]);

      const result = service.migrate(mockDslV1, '3.0.0');
      expect(result.version).toBe('3.0.0');
    });

    it('should detect circular migration', () => {
      const circularMigrator: DslMigrator = {
        fromVersion: '1.0.0',
        toVersion: '1.0.0', // Circular!
        migrate: (dsl) => dsl,
      };

      service.registerMigrators([circularMigrator]);

      expect(() => service.migrate(mockDslV1, '2.0.0')).toThrow(
        BadRequestException,
      );
    });

    it('should throw if migration result has wrong version', () => {
      const badMigrator: DslMigrator = {
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        migrate: (dsl) => ({ ...dsl, version: '1.5.0' }), // Wrong version!
      };

      service.registerMigrators([badMigrator]);

      expect(() => service.migrate(mockDslV1, '2.0.0')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('canMigrate', () => {
    beforeEach(() => {
      service.registerMigrators([mockMigratorV1toV2, mockMigratorV2toV3]);
    });

    it('should return true for same version', () => {
      expect(service.canMigrate('1.0.0', '1.0.0')).toBe(true);
    });

    it('should return true if migration path exists', () => {
      expect(service.canMigrate('1.0.0', '2.0.0')).toBe(true);
      expect(service.canMigrate('1.0.0', '3.0.0')).toBe(true);
    });

    it('should return false if no migration path exists', () => {
      expect(service.canMigrate('1.0.0', '4.0.0')).toBe(false);
    });
  });

  describe('getMigrationPath', () => {
    beforeEach(() => {
      service.registerMigrators([mockMigratorV1toV2, mockMigratorV2toV3]);
    });

    it('should return single version for same version', () => {
      const path = service.getMigrationPath('1.0.0', '1.0.0');
      expect(path).toEqual(['1.0.0']);
    });

    it('should return migration path', () => {
      const path = service.getMigrationPath('1.0.0', '3.0.0');
      expect(path).toEqual(['1.0.0', '2.0.0', '3.0.0']);
    });

    it('should throw if no path exists', () => {
      expect(() => service.getMigrationPath('1.0.0', '4.0.0')).toThrow(
        BadRequestException,
      );
    });
  });
});
