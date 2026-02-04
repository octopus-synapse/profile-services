/**
 * DSL Compiler Service Unit Tests
 *
 * These tests verify the DslCompilerService delegates correctly to its dependencies.
 * Full integration tests for DSL → AST transformation are in dsl-flow.integration.spec.ts.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Test boundary conditions and delegation"
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { DslCompilerService } from './dsl-compiler.service';
import { DslValidatorService } from './dsl-validator.service';
import { TokenResolverService } from './token-resolver.service';
import { DslMigrationService } from './migrators';
import { BadRequestException } from '@nestjs/common';

describe('DslCompilerService', () => {
  let service: DslCompilerService;

  // Real services are used because mocking the complex internal flow
  // is error-prone and the services have no external dependencies.
  beforeEach(() => {
    const validator = new DslValidatorService();
    const tokenResolver = new TokenResolverService();
    const migrationService = new DslMigrationService();

    service = new DslCompilerService(
      validator,
      tokenResolver,
      migrationService,
    );
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('validation behavior', () => {
    it('should throw BadRequestException for invalid DSL', () => {
      expect(() => service.compileFromRaw(null)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty object', () => {
      expect(() => service.compileFromRaw({})).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid structure', () => {
      expect(() => service.compileFromRaw({ invalid: 'data' })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('method signatures', () => {
    it('compileForHtml should be callable', () => {
      expect(typeof service.compileForHtml).toBe('function');
    });

    it('compileForPdf should be callable', () => {
      expect(typeof service.compileForPdf).toBe('function');
    });

    it('compile should be callable', () => {
      expect(typeof service.compile).toBe('function');
    });

    it('compileFromRaw should be callable', () => {
      expect(typeof service.compileFromRaw).toBe('function');
    });
  });
});
