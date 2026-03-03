/**
 * Layer Separation Architecture Tests
 *
 * Validates Clean Architecture layer separation principles:
 * - Services MUST NOT return HTTP transport concerns (DataResponse, envelopes)
 * - Services MUST return domain/application data only
 * - Controllers handle HTTP envelope wrapping
 *
 * Uncle Bob: "Services contain business logic and return domain data.
 * Controllers handle HTTP concerns and wrap responses."
 */

import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_ROOT = 'src';

function listSourceFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith('.ts')) {
      files.push(absolutePath.replace(/\\/g, '/'));
    }
  }

  return files;
}

function listServiceFiles(dirPath: string): string[] {
  return listSourceFiles(dirPath).filter((filePath) =>
    filePath.endsWith('.service.ts'),
  );
}

function isEnvelopeLikeObject(objectLiteralBody: string): boolean {
  const hasSuccess = /(^|\n)\s*success\s*:/m.test(objectLiteralBody);
  const hasData = /(^|\n)\s*data\s*:/m.test(objectLiteralBody);
  const hasMeta = /(^|\n)\s*meta\s*:/m.test(objectLiteralBody);

  return hasSuccess || (hasData && hasMeta);
}

function hasReturnedEnvelopeVariable(content: string): boolean {
  const returnVarMatches = [
    ...content.matchAll(/return\s+([A-Za-z_$][\w$]*)\s*;/g),
  ];

  for (const match of returnVarMatches) {
    const variableName = match[1];
    const declarationRegex = new RegExp(
      `(?:const|let)\\s+${variableName}\\s*=\\s*\\{([\\s\\S]*?)\\};`,
      'm',
    );
    const declarationMatch = content.match(declarationRegex);

    if (!declarationMatch) {
      continue;
    }

    if (isEnvelopeLikeObject(declarationMatch[1])) {
      return true;
    }
  }

  return false;
}

describe('Architecture - Layer Separation', () => {
  describe('Services vs Controllers Responsibility Split', () => {
    it('services MUST NOT return HTTP transport concerns (DataResponse/envelopes)', () => {
      const violations: string[] = [];
      const serviceFiles = listServiceFiles(SOURCE_ROOT);

      for (const filePath of serviceFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Services MUST NOT use ApiResponseHelper (transport concern)
        if (content.includes('ApiResponseHelper')) {
          violations.push(
            `${filePath}: service uses ApiResponseHelper (transport concern)`,
          );
        }

        // Services MUST NOT import api-response.dto (transport concern)
        if (
          content.includes(
            "from '@/bounded-contexts/platform/common/dto/api-response.dto'",
          )
        ) {
          violations.push(
            `${filePath}: service imports api-response.dto (transport concern)`,
          );
        }

        // Services MUST NOT return DataResponse<T> (transport concern)
        if (content.includes('DataResponse<')) {
          violations.push(
            `${filePath}: service exposes DataResponse<T>; service should return domain/application data only`,
          );
        }

        // Services MUST NOT return envelope objects with 'success' field
        if (/return\s*\{[^}]*\bsuccess\s*:/s.test(content)) {
          violations.push(
            `${filePath}: service returns envelope-like object with success field`,
          );
        }

        // Check for direct return of envelope-like objects
        const directReturnObjectMatches = [
          ...content.matchAll(/return\s*\{([\s\S]*?)\};/g),
        ];

        if (
          directReturnObjectMatches.some((match) =>
            isEnvelopeLikeObject(match[1]),
          )
        ) {
          violations.push(
            `${filePath}: service returns envelope-like response object (success or data+meta)`,
          );
        }

        // Check for envelope returned via intermediary variable
        if (hasReturnedEnvelopeVariable(content)) {
          violations.push(
            `${filePath}: service returns envelope-like response via intermediary variable`,
          );
        }
      }

      expect(violations).toEqual([]);
    });
  });
});
