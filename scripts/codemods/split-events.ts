#!/usr/bin/env bun
/**
 * Etapa 1.2 — split de authentication.events.ts em 1 evento por arquivo.
 */

import { existsSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Project, SourceFile } from 'ts-morph';
import { loadProject, ROOT } from './lib';

const targets = [
  'src/bounded-contexts/identity/authentication/domain/events/authentication.events.ts',
];

function kebabize(className: string): string {
  return className
    .replace(/Event$/, '')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function splitOne(project: Project, sourceFile: SourceFile): void {
  const filePath = sourceFile.getFilePath();
  const folder = dirname(filePath);
  const indexPath = join(folder, 'index.ts');

  const classes = sourceFile.getClasses().filter((c) => c.isExported());
  if (classes.length === 0) return;

  const importDecls = sourceFile.getImportDeclarations().map((d) => d.getText());
  const fileLeadingComment =
    sourceFile.getStatementsWithComments()[0]?.getLeadingCommentRanges()[0]?.getText() ?? '';

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
    const newPath = join(folder, `${baseName}.event.ts`);
    if (existsSync(newPath)) continue;

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

    const moduleSpec = `./${baseName}.event`;
    if (!indexExports.has(moduleSpec)) {
      indexFile.addExportDeclaration({ moduleSpecifier: moduleSpec });
      indexExports.add(moduleSpec);
    }
    console.log(`  ${className} → ${baseName}.event.ts`);
  }

  project.removeSourceFile(sourceFile);
  if (existsSync(filePath)) unlinkSync(filePath);
  console.log(`✓ Split: ${filePath}`);
}

const project = loadProject();
for (const rel of targets) {
  const abs = resolve(ROOT, rel);
  const sf = project.getSourceFile(abs);
  if (!sf) continue;
  console.log(`\n→ Split ${rel}`);
  splitOne(project, sf);
}
project.saveSync();
console.log('Done.');
