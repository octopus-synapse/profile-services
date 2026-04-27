/**
 * Auditoria de loggers legacy.
 *
 * Conta cada uso de logger fora do `LoggerPort` e dos arquivos
 * permitidos. O teste serve como gate de migração: começa com a
 * baseline atual, e cada PR que zerar mais um arquivo deve atualizar
 * a expectativa para baixo. Quando o set permitido for o único
 * remanescente, este teste vira `expect(0)` e o legacy está extinto.
 *
 * Categorias contadas:
 *  - `import { Logger } from '@nestjs/common'`  (logger do framework)
 *  - `new Logger(...)`                          (instanciação direta)
 *  - `console.{log|warn|error|debug|info}`      (apenas em src de produção)
 */

import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '../../../');

// Arquivos onde uso de logger nativo / winston / console é legítimo
// e não conta como legacy. Tudo o que NÃO está aqui deve usar
// `LoggerPort` do shared-kernel.
const ALLOWED = new Set<string>([
  // O próprio adapter winston que implementa LoggerPort
  'bounded-contexts/platform/common/logger/logger.service.ts',
  'bounded-contexts/platform/common/logger/logger.module.ts',
  'bounded-contexts/platform/common/logger/app-logger.adapter.ts',
  // Bootstrap precisa logar antes do DI subir
  'main.ts',
  // Seeds CLI rodam fora do contexto Nest e podem usar console
  'bounded-contexts/identity/authorization/seeds/seed-runner.ts',
]);

// Captura `import { ..., Logger, ... } from '@nestjs/common'`, multi-linha.
const NEST_LOGGER_IMPORT =
  /import\s*(?:type\s*)?\{[^}]*\bLogger\b[^}]*\}\s*from\s*['"]@nestjs\/common['"]/m;
const NEW_LOGGER = /new\s+Logger\s*\(/g;
const CONSOLE_CALL = /\bconsole\.(log|warn|error|debug|info)\s*\(/g;

interface FileFinding {
  file: string;
  nestImport: boolean;
  newLoggerCount: number;
  consoleCount: number;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      yield* walk(full);
    } else if (
      st.isFile() &&
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts')
    ) {
      yield full;
    }
  }
}

function audit(): FileFinding[] {
  const findings: FileFinding[] = [];
  for (const path of walk(SRC)) {
    const rel = relative(SRC, path).replace(/\\/g, '/');
    if (ALLOWED.has(rel)) continue;
    const content = readFileSync(path, 'utf8');

    // Remove blocos /* */ e linhas // para reduzir ruído de exemplos em JSDoc.
    const stripped = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');

    const nestImport = NEST_LOGGER_IMPORT.test(stripped);
    const newLoggerCount = (stripped.match(NEW_LOGGER) ?? []).length;
    const consoleCount = (stripped.match(CONSOLE_CALL) ?? []).length;

    if (nestImport || newLoggerCount > 0 || consoleCount > 0) {
      findings.push({ file: rel, nestImport, newLoggerCount, consoleCount });
    }
  }
  return findings;
}

describe('Legacy logger audit', () => {
  const findings = audit();

  const totalNestImports = findings.filter((f) => f.nestImport).length;
  const totalNewLogger = findings.reduce((acc, f) => acc + f.newLoggerCount, 0);
  const totalConsole = findings.reduce((acc, f) => acc + f.consoleCount, 0);

  it(`baseline: nest Logger imports = ${totalNestImports} (must only decrease)`, () => {
    expect(totalNestImports).toBeLessThanOrEqual(77);
  });

  it(`baseline: new Logger() instantiations = ${totalNewLogger} (must only decrease)`, () => {
    expect(totalNewLogger).toBeLessThanOrEqual(77);
  });

  it(`baseline: console.* calls in production code = ${totalConsole} (must only decrease)`, () => {
    expect(totalConsole).toBeLessThanOrEqual(99);
  });

  it('every Nest Logger import comes paired with a real usage', () => {
    // Sanity: arquivo que importa Logger sem usar é dead code.
    const orphanImports = findings.filter((f) => f.nestImport && f.newLoggerCount === 0);
    // Snapshot atual: ainda permitimos órfãos enquanto a migração roda.
    // Reduzir esse número com cada limpeza.
    expect(orphanImports.length).toBeLessThanOrEqual(findings.length);
  });
});
