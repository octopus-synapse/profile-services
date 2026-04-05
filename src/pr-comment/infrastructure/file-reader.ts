/**
 * File Reader Infrastructure
 *
 * Adapter for reading attestation and CI metrics files.
 */

import type { AttestationData, CIMetrics } from '../domain/types';

// =============================================================================
// Types
// =============================================================================

export type ReadFileFn = (path: string) => Promise<string>;

export interface FileReader {
  readAttestation(path: string): Promise<AttestationData>;
  readCIMetrics(path: string): Promise<CIMetrics>;
}

// =============================================================================
// Default Read Implementation
// =============================================================================

async function defaultReadFile(path: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  return readFile(path, 'utf-8');
}

// =============================================================================
// File Reader Factory
// =============================================================================

export function createFileReader(readFile: ReadFileFn = defaultReadFile): FileReader {
  return {
    async readAttestation(path: string): Promise<AttestationData> {
      const content = await readFile(path);
      const data = JSON.parse(content) as AttestationData;

      // Validate required fields
      if (!data.metrics) {
        throw new Error('Invalid attestation: missing metrics');
      }

      return data;
    },

    async readCIMetrics(path: string): Promise<CIMetrics> {
      const content = await readFile(path);
      const data = JSON.parse(content) as CIMetrics;

      // Provide defaults for missing jobs
      return {
        build: data.build ?? { status: 'pending', duration_ms: 0 },
        integration: data.integration ?? { status: 'pending', duration_ms: 0 },
        e2e: data.e2e ?? { status: 'pending', duration_ms: 0 },
        security: data.security ?? { status: 'pending', duration_ms: 0 },
      };
    },
  };
}

// =============================================================================
// Stdin Reader
// =============================================================================

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString('utf-8');
}
