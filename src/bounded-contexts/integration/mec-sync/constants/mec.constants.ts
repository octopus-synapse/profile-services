/**
 * MEC Constants
 * Single Responsibility: Configuration constants for MEC sync
 */

import * as path from 'path';

/**
 * MEC CSV source URL
 */
export const MEC_CSV_URL =
  'https://dadosabertos.mec.gov.br/images/conteudo/Ind-ensino-superior/2022//PDA_Dados_Cursos_Graduacao_Brasil.csv';

/**
 * Local cache path for downloaded CSV
 */
export const LOCAL_CSV_PATH = path.join(
  process.cwd(),
  'data',
  'mec-courses.csv',
);

/**
 * Cache validity in days
 */
export const CACHE_VALIDITY_DAYS = 6;

/**
 * Database batch size for bulk inserts
 */
export const BATCH_SIZE = 500;

/**
 * Puppeteer timeouts (in milliseconds)
 */
export const PUPPETEER_CONFIG = {
  NAVIGATION_TIMEOUT: 60000,
  DOWNLOAD_TIMEOUT: 180000,
  CHALLENGE_TIMEOUT: 45000,
  HUMAN_DELAY: 2000,
} as const;

/**
 * Puppeteer launch arguments
 */
export const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-web-security',
  '--disable-features=VizDisplayCompositor',
  '--window-size=1920,1080',
] as const;
