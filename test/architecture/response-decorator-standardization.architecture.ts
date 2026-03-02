import { describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCE_ROOT = 'src';

const COMPOSED_DECORATOR_PATTERN =
  /@ApiDataResponse\(|@ApiPaginatedDataResponse\(|@ApiEmptyDataResponse\(|@ApiStreamResponse\(/;

function listControllerFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...listControllerFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith('.controller.ts')) {
      files.push(absolutePath.replace(/\\/g, '/'));
    }
  }

  return files;
}

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

function readLines(filePath: string): string[] {
  return fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
}

function extractDataResponseGeneric(line: string): string | null {
  const marker = 'DataResponse<';
  const start = line.indexOf(marker);
  if (start === -1) {
    return null;
  }

  const fromGeneric = line.slice(start + marker.length);
  const end = fromGeneric.indexOf('>');
  if (end === -1) {
    return null;
  }

  return fromGeneric.slice(0, end).trim();
}

function isDtoGeneric(genericType: string): boolean {
  return genericType.includes('Dto');
}

describe('Architecture - Response Decorator Standardization', () => {
  it('enforces DataResponse + DTO response contract across controllers', () => {
    const violations: string[] = [];
    const controllers = listControllerFiles(SOURCE_ROOT);

    for (const filePath of controllers) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = readLines(filePath);

      // All controllers MUST use composed decorators instead of raw @ApiResponse.
      if (content.includes('@ApiResponse(')) {
        violations.push(
          `${filePath}: uses @ApiResponse directly — migrate to @ApiDataResponse / @ApiPaginatedDataResponse / @ApiEmptyDataResponse / @ApiStreamResponse`,
        );
      }

      // Controllers should follow the explicit envelope style used in DSL controller
      // instead of helper shortcuts, to keep response shape obvious at call-site.
      if (content.includes('ApiResponseHelper.')) {
        violations.push(
          `${filePath}: uses ApiResponseHelper in controller — return explicit envelope ({ success, data/message/meta })`,
        );
      }

      // If a controller uses the DataResponse<T> envelope it MUST also use
      // the composed @ApiDataResponse / @ApiPaginatedDataResponse / @ApiEmptyDataResponse
      // decorator so that Swagger reflects the actual response shape.
      if (
        content.includes('DataResponse<') &&
        !COMPOSED_DECORATOR_PATTERN.test(content)
      ) {
        violations.push(
          `${filePath}: uses DataResponse<T> but does not use composed response decorators (@ApiDataResponse / @ApiPaginatedDataResponse / @ApiEmptyDataResponse / @ApiStreamResponse)`,
        );
      }

      for (const [index, line] of lines.entries()) {
        const genericType = extractDataResponseGeneric(line);
        if (!genericType) {
          continue;
        }

        const lowerGeneric = genericType.toLowerCase();
        if (lowerGeneric === 'unknown') {
          violations.push(
            `${filePath}:${index + 1} uses DataResponse<unknown>`,
          );
        }

        if (lowerGeneric === 'null') {
          violations.push(`${filePath}:${index + 1} uses DataResponse<null>`);
        }

        if (genericType.startsWith('{')) {
          violations.push(
            `${filePath}:${index + 1} uses inline object type in DataResponse; create a dedicated DTO`,
          );
        }

        if (!genericType.startsWith('{') && !isDtoGeneric(genericType)) {
          violations.push(
            `${filePath}:${index + 1} DataResponse generic is not DTO-based (${genericType})`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('enforces single canonical ApiResponse DTO source', () => {
    const violations: string[] = [];

    const legacyDtoPath = path.join(
      SOURCE_ROOT,
      'shared-kernel/dtos/api-response.dto.ts',
    );

    if (fs.existsSync(legacyDtoPath)) {
      violations.push(
        `${legacyDtoPath}: legacy duplicate ApiResponse DTO detected — use src/bounded-contexts/platform/common/dto/api-response.dto.ts as single source`,
      );
    }

    expect(violations).toEqual([]);
  });

  it('forbids ApiResponseHelper usage in application source', () => {
    const violations: string[] = [];
    const sourceFiles = listSourceFiles(SOURCE_ROOT);

    for (const filePath of sourceFiles) {
      if (filePath.endsWith('platform/common/dto/api-response.dto.ts')) {
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('ApiResponseHelper')) {
        violations.push(
          `${filePath}: uses deprecated ApiResponseHelper — return explicit envelope at controller boundary`,
        );
      }
    }

    expect(violations).toEqual([]);
  });

  it('enforces service/controller response responsibility split', () => {
    const violations: string[] = [];
    const serviceFiles = listServiceFiles(SOURCE_ROOT);

    for (const filePath of serviceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (content.includes('ApiResponseHelper')) {
        violations.push(
          `${filePath}: service uses ApiResponseHelper (transport concern)`,
        );
      }

      if (
        content.includes(
          "from '@/bounded-contexts/platform/common/dto/api-response.dto'",
        )
      ) {
        violations.push(
          `${filePath}: service imports api-response.dto (transport concern)`,
        );
      }

      if (content.includes('DataResponse<')) {
        violations.push(
          `${filePath}: service exposes DataResponse<T>; service should return domain/application data only`,
        );
      }

      if (/return\s*\{[^}]*\bsuccess\s*:/s.test(content)) {
        violations.push(
          `${filePath}: service returns envelope-like object with success field`,
        );
      }
    }

    expect(violations).toEqual([]);
  });
});
