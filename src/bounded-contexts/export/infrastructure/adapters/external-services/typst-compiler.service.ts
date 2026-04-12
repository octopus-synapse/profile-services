/**
 * Typst Compiler Service
 *
 * Manages temp file lifecycle and invokes the Typst CLI binary
 * to compile .typ templates into PDF buffers.
 */

import { spawn } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { nanoid } from 'nanoid';

const DEFAULT_TIMEOUT_MS = 30_000;
const TYPST_BINARY = process.env.TYPST_BINARY_PATH ?? 'typst';
const FONT_PATH = process.env.TYPST_FONT_PATH ?? '/usr/share/fonts/resume-fonts';

export interface TypstCompileOptions {
  timeout?: number;
}

@Injectable()
export class TypstCompilerService {
  private readonly logger = new Logger(TypstCompilerService.name);
  private templateDir: string | null = null;
  private atsTemplateDir: string | null = null;

  /**
   * Compile a Typst document with injected JSON data into a PDF buffer.
   *
   * @param jsonData - Serialized ResumeAst JSON string
   * @param templatesPath - Absolute path to the directory containing .typ templates
   * @param options - Compilation options (timeout)
   * @returns PDF buffer
   */
  async compile(
    jsonData: string,
    templatesPath: string,
    options: TypstCompileOptions = {},
  ): Promise<Buffer> {
    const workDir = join('/tmp', `typst-${nanoid(10)}`);
    const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;

    try {
      await mkdir(workDir, { recursive: true });

      // Write data file and symlink templates
      await Promise.all([
        writeFile(join(workDir, 'data.json'), jsonData, 'utf-8'),
        this.linkTemplates(workDir, templatesPath),
      ]);

      const inputPath = join(workDir, 'resume.typ');
      const outputPath = join(workDir, 'output.pdf');

      const result = await this.execTypst(inputPath, outputPath, timeout);

      if (result.exitCode !== 0) {
        this.logger.error(`Typst compilation failed: ${result.stderr}`);
        throw new Error(`Typst compilation failed: ${this.parseTypstError(result.stderr)}`);
      }

      return await readFile(outputPath);
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch((err) => {
        this.logger.warn(`Failed to cleanup temp dir ${workDir}: ${err.message}`);
      });
    }
  }

  /**
   * Get the resolved path to the templates directory.
   * Caches the result after first resolution.
   */
  async getTemplatesPath(): Promise<string> {
    if (this.templateDir) return this.templateDir;

    // Try common locations in order
    const candidates = [
      process.env.TYPST_TEMPLATES_PATH,
      join(process.cwd(), 'templates', 'typst'),
      join(process.cwd(), 'dist', 'templates', 'typst'),
      join(
        process.cwd(),
        'src',
        'bounded-contexts',
        'export',
        'infrastructure',
        'typst',
        'templates',
      ),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      try {
        await access(candidate);
        this.templateDir = candidate;
        this.logger.log(`Typst templates found at: ${candidate}`);
        return candidate;
      } catch {
        // not found, try next
      }
    }

    throw new Error(
      `Typst templates not found. Tried: ${candidates.join(', ')}. Set TYPST_TEMPLATES_PATH env var.`,
    );
  }

  /**
   * Get the resolved path to the ATS-optimized templates directory.
   */
  async getAtsTemplatesPath(): Promise<string> {
    if (this.atsTemplateDir) return this.atsTemplateDir;

    const defaultPath = await this.getTemplatesPath();
    // ATS templates live in a sibling directory: templates-ats/
    const atsPath = defaultPath.replace(/templates\/?$/, 'templates-ats');

    try {
      await access(atsPath);
      this.atsTemplateDir = atsPath;
      this.logger.log(`ATS Typst templates found at: ${atsPath}`);
      return atsPath;
    } catch {
      throw new Error(
        `ATS Typst templates not found at ${atsPath}. Ensure templates-ats/ directory exists.`,
      );
    }
  }

  /**
   * Copy the templates directory into the work directory so that
   * resume.typ and partials/ are accessible from the work dir.
   *
   * Uses hard copies instead of symlinks because Typst resolves
   * relative paths (e.g. `json("data.json")`) against the real
   * file location, not the symlink location.
   */
  private async linkTemplates(workDir: string, templatesPath: string): Promise<void> {
    const { readdir, copyFile, cp } = await import('node:fs/promises');
    const entries = await readdir(templatesPath, { withFileTypes: true });

    await Promise.all(
      entries.map((entry) => {
        const src = join(templatesPath, entry.name);
        const dest = join(workDir, entry.name);
        return entry.isDirectory() ? cp(src, dest, { recursive: true }) : copyFile(src, dest);
      }),
    );
  }

  private execTypst(
    inputPath: string,
    outputPath: string,
    timeout: number,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const args = ['compile', '--font-path', FONT_PATH, inputPath, outputPath];

      this.logger.debug(`Executing: ${TYPST_BINARY} ${args.join(' ')}`);

      const child = spawn(TYPST_BINARY, args, {
        timeout,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ exitCode: code ?? 1, stdout, stderr });
      });

      child.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(
            new Error(
              `Typst binary not found at "${TYPST_BINARY}". Install Typst or set TYPST_BINARY_PATH.`,
            ),
          );
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Compile to PNG image (first page only).
   * Typst outputs {name}{page}.png — we read page 1.
   */
  async compileToImage(
    jsonData: string,
    templatesPath: string,
    options: TypstCompileOptions & { ppi?: number } = {},
  ): Promise<Buffer> {
    const workDir = join('/tmp', `typst-${nanoid(10)}`);
    const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;

    try {
      await mkdir(workDir, { recursive: true });

      await Promise.all([
        writeFile(join(workDir, 'data.json'), jsonData, 'utf-8'),
        this.linkTemplates(workDir, templatesPath),
      ]);

      const inputPath = join(workDir, 'resume.typ');
      const outputPath = join(workDir, 'output{n}.png');
      const ppi = options.ppi ?? 150;

      const result = await this.execTypstWithArgs(
        ['compile', '--font-path', FONT_PATH, '--ppi', String(ppi), inputPath, outputPath],
        timeout,
      );

      if (result.exitCode !== 0) {
        throw new Error(`Typst PNG compilation failed: ${this.parseTypstError(result.stderr)}`);
      }

      // Read first page
      return await readFile(join(workDir, 'output1.png'));
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private execTypstWithArgs(
    args: string[],
    timeout: number,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(TYPST_BINARY, args, {
        timeout,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      child.on('close', (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
      child.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error(`Typst binary not found at "${TYPST_BINARY}".`));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Extract a human-readable error from Typst's stderr output.
   */
  private parseTypstError(stderr: string): string {
    if (!stderr.trim()) return 'Unknown compilation error';

    // Typst errors typically start with "error:" lines
    const errorLines = stderr
      .split('\n')
      .filter((line) => line.startsWith('error:') || line.includes('error:'))
      .map((line) => line.replace(/^error:\s*/, '').trim());

    return errorLines.length > 0 ? errorLines.join('; ') : stderr.trim().slice(0, 500);
  }
}
