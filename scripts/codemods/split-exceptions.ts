#!/usr/bin/env bun
/**
 * Etapa 1 — split de arquivos *.exceptions.ts em 1 classe por arquivo.
 *
 * Para cada {bc}.exceptions.ts grande:
 * 1. Cria {kebab-name}.exception.ts por classe
 * 2. Cria/atualiza index.ts agregando os exports
 * 3. Remove o arquivo original
 * 4. Atualiza imports referenciando o arquivo original (apontam pro index)
 */

import { existsSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Project, type SourceFile } from 'ts-morph';
import { loadProject, ROOT } from './lib';

const targets = [
  'src/bounded-contexts/resumes/domain/exceptions/resumes.exceptions.ts',
  'src/bounded-contexts/integration/domain/exceptions/integration.exceptions.ts',
  'src/bounded-contexts/presentation/domain/exceptions/presentation.exceptions.ts',
];
// shared-kernel/exceptions/domain.exceptions.ts: NÃO splittar — é uma hierarquia base
// (DomainException, ValidationException, etc.) intencionalmente em 1 arquivo

// Acrônimos que devem ficar juntos em kebab-case
const ACRONYMS = [
  'GitHub',
  'MEC',
  'CSV',
  'API',
  'JSON',
  'OAuth',
  'OTP',
  'JWT',
  'DSL',
  'DTO',
  'HTTP',
  'URL',
  'TOTP',
  'IP',
  'TXT',
  'PDF',
  'XML',
];

function normalizeAcronyms(name: string): string {
  let out = name;
  for (const acr of ACRONYMS) {
    // GitHub → Github (1 letra cap + resto lower) pra cair na regra normal
    const norm = acr[0]! + acr.slice(1).toLowerCase();
    out = out.replace(new RegExp(acr, 'g'), norm);
  }
  return out;
}

function kebabize(className: string): string {
  const stripped = className.replace(/Exception$/, '');
  const normalized = normalizeAcronyms(stripped);
  return normalized
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function splitOne(project: Project, sourceFile: SourceFile): void {
  const filePath = sourceFile.getFilePath();
  const folder = dirname(filePath);
  const indexPath = join(folder, 'index.ts');

  const classes = sourceFile.getClasses().filter((c) => c.isExported());
  if (classes.length === 0) {
    console.warn(`SKIP: nenhuma classe exportada em ${filePath}`);
    return;
  }

  // Importação compartilhada: pega todos os imports do arquivo original
  const importDecls = sourceFile.getImportDeclarations().map((d) => d.getText());
  const fileLeadingComment =
    sourceFile.getStatementsWithComments()[0]?.getLeadingCommentRanges()[0]?.getText() ?? '';

  // Dedup: se já houver index.ts com exports, vamos respeitar
  let indexFile = project.getSourceFile(indexPath);
  if (!indexFile) {
    indexFile = project.createSourceFile(indexPath, '', { overwrite: false });
  }

  const indexExports = new Set(
    indexFile
      .getExportDeclarations()
      .map((d) => d.getModuleSpecifierValue())
      .filter((v): v is string => !!v),
  );

  for (const cls of classes) {
    const className = cls.getName()!;
    const baseName = kebabize(className);
    const newPath = join(folder, `${baseName}.exception.ts`);

    if (existsSync(newPath)) {
      console.warn(`  SKIP class ${className}: ${newPath} já existe`);
      continue;
    }

    const classText = cls.getText();
    const leadingComments =
      cls
        .getLeadingCommentRanges()
        ?.map((r) => r.getText())
        .join('\n') ?? '';

    const content = [
      fileLeadingComment.trim() || null,
      importDecls.join('\n').trim() || null,
      '',
      leadingComments.trim() || null,
      classText,
      '',
    ]
      .filter((s) => s !== null)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');

    project.createSourceFile(newPath, content, { overwrite: false });

    const moduleSpec = `./${baseName}.exception`;
    if (!indexExports.has(moduleSpec)) {
      indexFile.addExportDeclaration({ moduleSpecifier: moduleSpec });
      indexExports.add(moduleSpec);
    }

    console.log(`  ${className} → ${baseName}.exception.ts`);
  }

  // Remove arquivo original (do projeto e do disco)
  project.removeSourceFile(sourceFile);
  if (existsSync(filePath)) unlinkSync(filePath);

  console.log(`✓ Split concluído: ${filePath}`);
}

console.log('Carregando projeto ts-morph...');
const project = loadProject();

for (const rel of targets) {
  const abs = resolve(ROOT, rel);
  const sf = project.getSourceFile(abs);
  if (!sf) {
    console.warn(`SKIP: ${rel} não encontrado`);
    continue;
  }
  console.log(`\n→ Split ${rel}`);
  splitOne(project, sf);
}

console.log('\nSalvando...');
project.saveSync();
console.log('Done.');
