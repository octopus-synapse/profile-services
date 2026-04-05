import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  createFileReader,
  type ReadFileFn,
} from '../../../src/pr-comment/infrastructure/file-reader';

describe('file-reader', () => {
  let mockReadFile: ReturnType<typeof mock<ReadFileFn>>;

  beforeEach(() => {
    mockReadFile = mock(() => Promise.resolve(''));
  });

  describe('readAttestation', () => {
    it('parses valid attestation JSON', async () => {
      const attestationJson = JSON.stringify({
        version: '3',
        tree_hash: 'abc123',
        checks: 'all',
        metrics: {
          swagger: { status: 'ok', time_ms: 1000 },
          typecheck: { status: 'ok', time_ms: 2000 },
        },
        timestamp: '2024-01-01T00:00:00Z',
        git_user: 'test@example.com',
      });

      mockReadFile.mockResolvedValueOnce(attestationJson);

      const reader = createFileReader(mockReadFile);
      const data = await reader.readAttestation('/path/to/.attestation');

      expect(data.version).toBe('3');
      expect(data.tree_hash).toBe('abc123');
      expect(data.metrics.swagger?.status).toBe('ok');
      expect(data.metrics.typecheck?.time_ms).toBe(2000);
    });

    it('throws on missing metrics field', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ version: '3' }));

      const reader = createFileReader(mockReadFile);

      await expect(reader.readAttestation('/path')).rejects.toThrow(
        'Invalid attestation: missing metrics',
      );
    });

    it('throws on invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('not valid json');

      const reader = createFileReader(mockReadFile);

      await expect(reader.readAttestation('/path')).rejects.toThrow();
    });

    it('calls readFile with correct path', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ metrics: {} }));

      const reader = createFileReader(mockReadFile);
      await reader.readAttestation('/my/custom/path.json');

      expect(mockReadFile).toHaveBeenCalledWith('/my/custom/path.json');
    });
  });

  describe('readCIMetrics', () => {
    it('parses valid CI metrics JSON', async () => {
      const ciJson = JSON.stringify({
        build: { status: 'success', duration_ms: 60000 },
        integration: { status: 'success', duration_ms: 180000, passed: 150, failed: 0, skipped: 5 },
        e2e: { status: 'fail', duration_ms: 240000, passed: 45, failed: 5, skipped: 2 },
        security: { status: 'running', duration_ms: 0 },
      });

      mockReadFile.mockResolvedValueOnce(ciJson);

      const reader = createFileReader(mockReadFile);
      const data = await reader.readCIMetrics('/path/to/ci.json');

      expect(data.build.status).toBe('success');
      expect(data.integration.passed).toBe(150);
      expect(data.e2e.status).toBe('fail');
      expect(data.security.status).toBe('running');
    });

    it('provides defaults for missing jobs', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify({}));

      const reader = createFileReader(mockReadFile);
      const data = await reader.readCIMetrics('/path');

      expect(data.build).toEqual({ status: 'pending', duration_ms: 0 });
      expect(data.integration).toEqual({ status: 'pending', duration_ms: 0 });
      expect(data.e2e).toEqual({ status: 'pending', duration_ms: 0 });
      expect(data.security).toEqual({ status: 'pending', duration_ms: 0 });
    });

    it('provides defaults for partial data', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          build: { status: 'success', duration_ms: 60000 },
        }),
      );

      const reader = createFileReader(mockReadFile);
      const data = await reader.readCIMetrics('/path');

      expect(data.build.status).toBe('success');
      expect(data.integration).toEqual({ status: 'pending', duration_ms: 0 });
    });

    it('throws on invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('invalid');

      const reader = createFileReader(mockReadFile);

      await expect(reader.readCIMetrics('/path')).rejects.toThrow();
    });
  });
});
