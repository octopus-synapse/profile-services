/**
 * TypstCompilerService Tests
 *
 * Tests CLI invocation, temp file management, and error handling.
 * Mocks child_process.spawn to avoid requiring Typst binary in CI.
 */

import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import * as fs from 'node:fs/promises';
import { Test, TestingModule } from '@nestjs/testing';
import { TypstCompilerService } from './typst-compiler.service';

describe('TypstCompilerService', () => {
  let service: TypstCompilerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TypstCompilerService],
    }).compile();

    service = module.get<TypstCompilerService>(TypstCompilerService);
  });

  describe('getTemplatesPath', () => {
    it('should resolve templates path from source directory', async () => {
      const templatesPath = await service.getTemplatesPath();
      expect(templatesPath).toBeTruthy();
      expect(typeof templatesPath).toBe('string');
    });

    it('should cache the resolved path', async () => {
      const first = await service.getTemplatesPath();
      const second = await service.getTemplatesPath();
      expect(first).toBe(second);
    });
  });

  describe('compile', () => {
    it('should throw if typst binary is not found', async () => {
      // Use an invalid binary path to trigger ENOENT
      const originalEnv = process.env.TYPST_BINARY_PATH;
      process.env.TYPST_BINARY_PATH = '/nonexistent/typst-binary';

      const svc = new TypstCompilerService();

      await expect(svc.compile('{}', '/tmp/fake-templates')).rejects.toThrow();

      process.env.TYPST_BINARY_PATH = originalEnv;
    });

    it('should cleanup temp directory even on failure', async () => {
      const rmdirSpy = spyOn(fs, 'rm');

      try {
        await service.compile('{}', '/tmp/nonexistent-templates');
      } catch {
        // Expected to fail
      }

      // rm should have been called for cleanup
      expect(rmdirSpy).toHaveBeenCalled();
      const callArgs = rmdirSpy.mock.calls[0];
      expect(callArgs[0]).toContain('/tmp/typst-');
      expect(callArgs[1]).toEqual({ recursive: true, force: true });

      rmdirSpy.mockRestore();
    });
  });
});
