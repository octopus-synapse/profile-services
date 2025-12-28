/**
 * MEC CSV Parser Service
 * Handles downloading and parsing the MEC courses dataset
 * Uses Puppeteer with Stealth plugin to bypass Cloudflare protection
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import {
  MecCsvRow,
  NormalizedInstitution,
  NormalizedCourse,
  SyncError,
} from '../interfaces/mec-data.interface';
import * as fs from 'fs';
import * as path from 'path';
import type { Browser, Page, HTTPResponse } from 'puppeteer';

// Dynamic imports for packages without proper types
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
const iconv: {
  decode: (buffer: Buffer, encoding: string) => string;
} = require('iconv-lite');
const puppeteerExtra: {
  use: (plugin: unknown) => void;
  launch: (options: Record<string, unknown>) => Promise<Browser>;
} = require('puppeteer-extra');
const StealthPlugin: () => unknown = require('puppeteer-extra-plugin-stealth');
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */

// Enable stealth mode to bypass Cloudflare detection
puppeteerExtra.use(StealthPlugin());

const MEC_CSV_URL =
  'https://dadosabertos.mec.gov.br/images/conteudo/Ind-ensino-superior/2022//PDA_Dados_Cursos_Graduacao_Brasil.csv';

// Local cache path for downloaded CSV
const LOCAL_CSV_PATH = path.join(process.cwd(), 'data', 'mec-courses.csv');

interface ParseResult {
  institutions: Map<number, NormalizedInstitution>;
  courses: NormalizedCourse[];
  errors: SyncError[];
  totalRows: number;
  fileSize: number;
}

@Injectable()
export class MecCsvParserService {
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Download and parse the MEC CSV file
   * Uses Puppeteer to bypass Cloudflare protection
   * Caches the file locally for faster subsequent syncs
   */
  async downloadAndParse(url: string = MEC_CSV_URL): Promise<ParseResult> {
    let csvBuffer: Buffer;

    // Check if we have a recent local cache (less than 1 day old)
    const useCache = this.shouldUseCache();

    if (useCache) {
      this.logger.log(
        `Using cached CSV file: ${LOCAL_CSV_PATH}`,
        'MecCsvParser',
      );
      csvBuffer = fs.readFileSync(LOCAL_CSV_PATH);
    } else {
      try {
        this.logger.log(
          `Downloading CSV via Puppeteer (bypasses Cloudflare): ${url}`,
          'MecCsvParser',
        );
        csvBuffer = await this.downloadWithPuppeteer(url);
        this.logger.log(
          `Downloaded ${(csvBuffer.length / 1024 / 1024).toFixed(2)} MB`,
          'MecCsvParser',
        );

        // Cache the file locally
        this.cacheFile(csvBuffer);
      } catch (error) {
        this.logger.warn(
          `Puppeteer download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MecCsvParser',
        );

        // Try local fallback if exists
        if (fs.existsSync(LOCAL_CSV_PATH)) {
          this.logger.log(
            `Falling back to local CSV: ${LOCAL_CSV_PATH}`,
            'MecCsvParser',
          );
          csvBuffer = fs.readFileSync(LOCAL_CSV_PATH);
        } else {
          throw new Error(
            `MEC CSV download failed. Error: ${error instanceof Error ? error.message : 'Unknown'}. ` +
              `No local cache available at ${LOCAL_CSV_PATH}.`,
          );
        }
      }
    }

    // Try to detect encoding - if it's already valid UTF-8, use it directly
    // Otherwise, try Latin-1 decoding (older MEC CSVs used Latin-1)
    let csvContent: string;
    try {
      // Check if buffer is valid UTF-8
      const utf8Content = csvBuffer.toString('utf8');
      // If no replacement characters, it's valid UTF-8
      if (!utf8Content.includes('\uFFFD')) {
        csvContent = utf8Content;
        this.logger.log('CSV detected as UTF-8', 'MecCsvParser');
      } else {
        csvContent = iconv.decode(csvBuffer, 'latin1');
        this.logger.log(
          'CSV detected as Latin-1, converted to UTF-8',
          'MecCsvParser',
        );
      }
    } catch {
      // Fallback to Latin-1
      csvContent = iconv.decode(csvBuffer, 'latin1');
      this.logger.log('CSV encoding fallback to Latin-1', 'MecCsvParser');
    }

    return this.parseCsv(csvContent, csvBuffer.length);
  }

  /**
   * Check if we should use cached file
   * Returns true if cache exists and is less than 6 days old
   */
  private shouldUseCache(): boolean {
    if (!fs.existsSync(LOCAL_CSV_PATH)) {
      return false;
    }

    const stats = fs.statSync(LOCAL_CSV_PATH);
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;

    return stats.mtimeMs > sixDaysAgo;
  }

  /**
   * Cache the downloaded CSV file
   */
  private cacheFile(buffer: Buffer): void {
    try {
      const dir = path.dirname(LOCAL_CSV_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LOCAL_CSV_PATH, buffer);
      this.logger.log(`Cached CSV to: ${LOCAL_CSV_PATH}`, 'MecCsvParser');
    } catch (error) {
      this.logger.warn(
        `Failed to cache CSV: ${error instanceof Error ? error.message : 'Unknown'}`,
        'MecCsvParser',
      );
    }
  }

  /**
   * Download file using Puppeteer with Stealth plugin to bypass Cloudflare
   * This simulates a real browser and passes JS challenges automatically
   */
  private async downloadWithPuppeteer(url: string): Promise<Buffer> {
    this.logger.log('Launching Puppeteer with stealth mode...', 'MecCsvParser');

    const browser: Browser = await puppeteerExtra.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1920,1080',
      ],
    });

    try {
      const page: Page = await browser.newPage();

      // Set extra HTTP headers to look more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      });

      // Set viewport to look like a real desktop browser
      await page.setViewport({ width: 1920, height: 1080 });

      this.logger.log(`Navigating to: ${url}`, 'MecCsvParser');

      // First, go to the main site to get cookies
      const mainSiteUrl = 'https://dadosabertos.mec.gov.br';
      await page.goto(mainSiteUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait a bit to simulate human behavior
      await this.delay(2000);

      // Check if we hit a Cloudflare challenge
      let content = await page.content();
      if (this.isCloudflareChallenge(content)) {
        this.logger.log(
          'Cloudflare challenge detected, waiting for it to complete...',
          'MecCsvParser',
        );

        // Wait for the challenge to resolve (Cloudflare typically redirects after solving)
        await page.waitForFunction(
          () => {
            const body = document.body?.innerHTML || '';
            return (
              !body.includes('Just a moment') &&
              !body.includes('Checking your browser') &&
              !body.includes('Verifying') &&
              !body.includes('cf-spinner')
            );
          },
          { timeout: 45000 },
        );

        this.logger.log('Cloudflare challenge passed!', 'MecCsvParser');
        await this.delay(1000);
      }

      // Now navigate to the actual CSV file
      this.logger.log('Requesting CSV file...', 'MecCsvParser');
      const response: HTTPResponse | null = await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 180000, // 3 minutes for large file
      });

      if (!response) {
        throw new Error('No response received');
      }

      // Check again for Cloudflare
      content = await page.content();
      if (this.isCloudflareChallenge(content)) {
        this.logger.log(
          'Second Cloudflare challenge, waiting...',
          'MecCsvParser',
        );

        await page.waitForFunction(
          () => {
            const body = document.body?.innerHTML || '';
            return (
              !body.includes('Just a moment') &&
              !body.includes('Checking your browser')
            );
          },
          { timeout: 45000 },
        );

        // Retry the download
        const retryResponse: HTTPResponse | null = await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 180000,
        });

        if (!retryResponse) {
          throw new Error('No response after Cloudflare retry');
        }

        const buffer = Buffer.from(await retryResponse.buffer());

        // Validate it's actually CSV, not HTML
        if (this.isHtmlContent(buffer)) {
          throw new Error(
            'Received HTML instead of CSV - Cloudflare may still be blocking',
          );
        }

        return buffer;
      }

      const csvBuffer = Buffer.from(await response.buffer());

      // Validate it's actually CSV
      if (this.isHtmlContent(csvBuffer)) {
        throw new Error(
          'Received HTML instead of CSV - Cloudflare may still be blocking',
        );
      }

      this.logger.log(
        `Successfully downloaded ${(csvBuffer.length / 1024 / 1024).toFixed(2)} MB`,
        'MecCsvParser',
      );

      return csvBuffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Check if content is a Cloudflare challenge page
   */
  private isCloudflareChallenge(content: string): boolean {
    return (
      content.includes('Just a moment') ||
      content.includes('Checking your browser') ||
      content.includes('cf-spinner') ||
      content.includes('Verifying you are human')
    );
  }

  /**
   * Check if buffer contains HTML (not CSV)
   */
  private isHtmlContent(buffer: Buffer): boolean {
    const start = buffer.slice(0, 100).toString('utf-8').toLowerCase();
    return start.includes('<!doctype') || start.includes('<html');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Parse CSV content and extract institutions/courses
   */
  private parseCsv(content: string, fileSize: number): ParseResult {
    // Normalize line endings (CRLF -> LF) and split
    const lines = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line) => line.trim());
    const errors: SyncError[] = [];

    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    // Parse header to get column indices
    const header = this.parseCsvLine(lines[0]);
    const columnMap = this.buildColumnMap(header);

    this.logger.log(
      `CSV has ${lines.length - 1} data rows, columns: ${header.length}`,
      'MecCsvParser',
    );

    // Use Maps to deduplicate institutions
    const institutions = new Map<number, NormalizedInstitution>();
    const courses: NormalizedCourse[] = [];

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCsvLine(lines[i]);
        const row = this.mapToRow(values, columnMap);

        // Extract institution (deduplicated by codigoIes)
        const institution = this.normalizeInstitution(row);
        if (institution && !institutions.has(institution.codigoIes)) {
          institutions.set(institution.codigoIes, institution);
        }

        // Extract course
        const course = this.normalizeCourse(row);
        if (course) {
          courses.push(course);
        }
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : 'Unknown error',
        });

        // Log every 1000th error to avoid spam
        if (errors.length % 1000 === 0) {
          this.logger.warn(
            `${errors.length} parse errors so far...`,
            'MecCsvParser',
          );
        }
      }
    }

    this.logger.log(
      `Parsed: ${institutions.size} institutions, ${courses.length} courses, ${errors.length} errors`,
      'MecCsvParser',
    );

    return {
      institutions,
      courses,
      errors,
      totalRows: lines.length - 1,
      fileSize,
    };
  }

  /**
   * Parse a single CSV line handling quoted fields
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    // MEC CSV uses semicolon as delimiter
    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Build a map of column names to indices
   */
  private buildColumnMap(header: string[]): Map<string, number> {
    const map = new Map<string, number>();
    header.forEach((col, index) => {
      // Normalize column names (remove BOM, trim, uppercase)
      const normalized = col
        .replace(/^\uFEFF/, '')
        .trim()
        .toUpperCase();
      map.set(normalized, index);
    });
    return map;
  }

  /**
   * Map array values to row object using column map
   * Column names from MEC CSV 2022:
   * CODIGO_IES, NOME_IES, CATEGORIA_ADMINISTRATIVA, ORGANIZACAO_ACADEMICA,
   * CODIGO_CURSO, NOME_CURSO, GRAU, AREA_OCDE, MODALIDADE, SITUACAO_CURSO,
   * QT_VAGAS_AUTORIZADAS, CARGA_HORARIA, CODIGO_AREA_OCDE_CINE, AREA_OCDE_CINE,
   * CODIGO_MUNICIPIO, MUNICIPIO, UF, REGIAO
   */
  private mapToRow(
    values: string[],
    columnMap: Map<string, number>,
  ): MecCsvRow {
    const getValue = (key: string): string => {
      const index = columnMap.get(key);
      return index !== undefined ? values[index] || '' : '';
    };

    return {
      CO_IES: getValue('CODIGO_IES') || getValue('CO_IES'),
      NO_IES: getValue('NOME_IES') || getValue('NO_IES'),
      SG_IES: getValue('SG_IES') || '', // Not in 2022 CSV
      TP_ORGANIZACAO:
        getValue('ORGANIZACAO_ACADEMICA') ||
        getValue('TP_ORGANIZACAO_ACADEMICA') ||
        getValue('TP_ORGANIZACAO'),
      TP_CATEGORIA:
        getValue('CATEGORIA_ADMINISTRATIVA') ||
        getValue('TP_CATEGORIA_ADMINISTRATIVA') ||
        getValue('TP_CATEGORIA'),
      CO_MUNICIPIO_IES:
        getValue('CODIGO_MUNICIPIO') ||
        getValue('CO_MUNICIPIO_IES') ||
        getValue('CO_MUNICIPIO'),
      NO_MUNICIPIO_IES:
        getValue('MUNICIPIO') ||
        getValue('NO_MUNICIPIO_IES') ||
        getValue('NO_MUNICIPIO'),
      SG_UF_IES: getValue('UF') || getValue('SG_UF_IES') || getValue('SG_UF'),
      CO_CURSO: getValue('CODIGO_CURSO') || getValue('CO_CURSO'),
      NO_CURSO: getValue('NOME_CURSO') || getValue('NO_CURSO'),
      TP_GRAU:
        getValue('GRAU') ||
        getValue('TP_GRAU_ACADEMICO') ||
        getValue('TP_GRAU'),
      TP_MODALIDADE:
        getValue('MODALIDADE') ||
        getValue('TP_MODALIDADE_ENSINO') ||
        getValue('TP_MODALIDADE'),
      NO_CINE_AREA_GERAL:
        getValue('AREA_OCDE_CINE') ||
        getValue('AREA_OCDE') ||
        getValue('NO_CINE_AREA_GERAL') ||
        getValue('NO_AREA'),
      QT_CARGA_HORARIA:
        getValue('CARGA_HORARIA') ||
        getValue('QT_CARGA_HORARIA_TOTAL') ||
        getValue('QT_CARGA_HORARIA'),
      CO_SITUACAO:
        getValue('SITUACAO_CURSO') ||
        getValue('CO_SITUACAO_CURSO') ||
        getValue('CO_SITUACAO'),
    };
  }

  /**
   * Normalize institution data from CSV row
   */
  private normalizeInstitution(row: MecCsvRow): NormalizedInstitution | null {
    const codigoIes = parseInt(row.CO_IES, 10);

    if (isNaN(codigoIes) || !row.NO_IES || !row.SG_UF_IES) {
      return null;
    }

    return {
      codigoIes,
      nome: this.normalizeText(row.NO_IES),
      sigla: this.normalizeText(row.SG_IES) || null,
      organizacao: this.mapOrganizacao(row.TP_ORGANIZACAO),
      categoria: this.mapCategoria(row.TP_CATEGORIA),
      uf: row.SG_UF_IES.toUpperCase(),
      municipio: this.normalizeText(row.NO_MUNICIPIO_IES) || null,
      codigoMunicipio: parseInt(row.CO_MUNICIPIO_IES, 10) || null,
    };
  }

  /**
   * Normalize course data from CSV row
   */
  private normalizeCourse(row: MecCsvRow): NormalizedCourse | null {
    const codigoCurso = parseInt(row.CO_CURSO, 10);
    const codigoIes = parseInt(row.CO_IES, 10);

    if (isNaN(codigoCurso) || isNaN(codigoIes) || !row.NO_CURSO) {
      return null;
    }

    return {
      codigoCurso,
      codigoIes,
      nome: this.normalizeText(row.NO_CURSO),
      grau: this.mapGrau(row.TP_GRAU),
      modalidade: this.mapModalidade(row.TP_MODALIDADE),
      areaConhecimento: this.normalizeText(row.NO_CINE_AREA_GERAL) || null,
      cargaHoraria: parseInt(row.QT_CARGA_HORARIA, 10) || null,
      situacao: this.mapSituacao(row.CO_SITUACAO),
    };
  }

  /**
   * Normalize text: trim, title case, remove extra spaces
   */
  private normalizeText(text: string | undefined): string {
    if (!text) return '';
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((word) => {
        // Keep small prepositions lowercase
        const lower = word.toLowerCase();
        if (
          ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com'].includes(
            lower,
          )
        ) {
          return lower;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Map organization type code to readable label
   */
  private mapOrganizacao(code: string): string | null {
    const map: Record<string, string> = {
      '1': 'Universidade',
      '2': 'Centro Universitário',
      '3': 'Faculdade',
      '4': 'Instituto Federal',
      '5': 'Centro Federal',
    };
    return map[code] || code || null;
  }

  /**
   * Map administrative category code to readable label
   */
  private mapCategoria(code: string): string | null {
    const map: Record<string, string> = {
      '1': 'Pública Federal',
      '2': 'Pública Estadual',
      '3': 'Pública Municipal',
      '4': 'Privada com fins lucrativos',
      '5': 'Privada sem fins lucrativos',
      '6': 'Especial',
    };
    return map[code] || code || null;
  }

  /**
   * Map academic degree code to readable label
   */
  private mapGrau(code: string): string | null {
    const map: Record<string, string> = {
      '1': 'Bacharelado',
      '2': 'Licenciatura',
      '3': 'Tecnológico',
      '4': 'Bacharelado e Licenciatura',
    };
    return map[code] || code || null;
  }

  /**
   * Map teaching modality code to readable label
   */
  private mapModalidade(code: string): string | null {
    const map: Record<string, string> = {
      '1': 'Presencial',
      '2': 'EaD',
    };
    return map[code] || code || null;
  }

  /**
   * Map course status code to readable label
   */
  private mapSituacao(code: string): string | null {
    const map: Record<string, string> = {
      '1': 'Em atividade',
      '2': 'Extinto',
      '3': 'Em extinção',
    };
    return map[code] || code || null;
  }
}
