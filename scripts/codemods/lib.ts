import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Project } from 'ts-morph';

export const ROOT = resolve(import.meta.dir, '..', '..');
export const TSCONFIG = join(ROOT, 'tsconfig.json');

export function loadProject(): Project {
  return new Project({
    tsConfigFilePath: TSCONFIG,
    skipFileDependencyResolution: false,
  });
}

export type Rename = { from: string; to: string };

export function renameFiles(project: Project, renames: Rename[]): void {
  for (const { from, to } of renames) {
    const fromAbs = resolve(ROOT, from);
    const toAbs = resolve(ROOT, to);

    if (!existsSync(fromAbs)) {
      console.warn(`SKIP: ${from} não existe`);
      continue;
    }
    if (existsSync(toAbs)) {
      console.warn(`SKIP: destino já existe ${to}`);
      continue;
    }

    const sf = project.getSourceFile(fromAbs);
    if (!sf) {
      console.warn(`SKIP: ${from} não está no projeto`);
      continue;
    }

    sf.move(toAbs);
    console.log(`mv ${from} → ${to}`);
  }
  project.saveSync();
}
