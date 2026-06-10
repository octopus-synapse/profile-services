#!/usr/bin/env bunx ts-node
/**
 * MEC CSV Download Script
 * Downloads the MEC courses CSV by navigating to the page and clicking the download link
 * This approach bypasses Cloudflare by simulating real user behavior
 *
 * Usage:
 *   bunx ts-node scripts/mec-download.ts
 *   # or with xvfb for headless servers:
 *   xvfb-run --auto-servernum bunx ts-node scripts/mec-download.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import puppeteer from 'puppeteer';

// Page that contains the download link
const MEC_PAGE_URL =
  'https://dadosabertos.mec.gov.br/indicadores-sobre-ensino-superior/item/183-cursos-de-graduacao-do-brasil';

// The CSV URL pattern to match
const CSV_URL_PATTERN = 'PDA_Dados_Cursos_Graduacao_Brasil.csv';

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'mec-courses.csv');

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCloudflareChallenge(content: string): boolean {
  return (
    content.includes('Just a moment') ||
    content.includes('Checking your browser') ||
    content.includes('cf-spinner') ||
    content.includes('Verifying you are human')
  );
}

/**
 * The managed challenge auto-resolves a few seconds after load and the
 * page then navigates to the real content. Checking `page.content()`
 * once right after `goto` races that navigation (the original script
 * saw the interstitial, found zero links and bailed). Poll the title
 * until it stops looking like a challenge page.
 */
async function waitForCloudflareResolution(
  page: import('puppeteer').Page,
  timeoutMs = 90000,
): Promise<void> {
  const startTime = Date.now();
  for (;;) {
    const [title, content] = await Promise.all([page.title(), page.content()]);
    const challenged = /just a moment|um momento/i.test(title) || isCloudflareChallenge(content);
    if (!challenged) return;
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Cloudflare challenge did not resolve in time');
    }
    console.log('⏳ Cloudflare challenge detected, waiting...');
    await delay(3000);
  }
}

/**
 * Waits for Chrome to finish writing the CSV into `dataDir`. Stall-based
 * rather than a fixed deadline: the ~225MB file takes longer than any
 * reasonable fixed timeout on a slow link, so we only give up when the
 * partial file stops growing for `STALL_TIMEOUT` (or the hard cap hits).
 */
async function waitForDownload(dataDir: string): Promise<void> {
  const STALL_TIMEOUT = 60000; // no byte progress for 1 min = dead
  const HARD_CAP = 1800000; // 30 min absolute ceiling
  const startTime = Date.now();
  let lastSize = -1;
  let lastProgressAt = Date.now();

  while (Date.now() - startTime < HARD_CAP) {
    await delay(2000);

    const files = fs.readdirSync(dataDir);

    // Finished file: any .csv that is not a Chrome partial.
    const csvFile = files.find((f) => f.endsWith('.csv') && !f.endsWith('.crdownload'));
    if (csvFile) {
      const filePath = path.join(dataDir, csvFile);
      const stats = fs.statSync(filePath);
      if (stats.size > 1000000) {
        await delay(2000);
        if (fs.statSync(filePath).size === stats.size) {
          if (filePath !== OUTPUT_PATH) {
            fs.renameSync(filePath, OUTPUT_PATH);
          }
          console.log(`✅ Downloaded ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          return;
        }
      }
    }

    // In-flight partial: track growth to detect stalls.
    const partial = files.find((f) => f.endsWith('.crdownload'));
    if (partial) {
      const size = fs.statSync(path.join(dataDir, partial)).size;
      if (size > lastSize) {
        lastSize = size;
        lastProgressAt = Date.now();
        console.log(`⏳ Downloading... ${(size / 1024 / 1024).toFixed(1)} MB`);
      }
    }

    if (Date.now() - lastProgressAt > STALL_TIMEOUT) {
      throw new Error(
        lastSize < 0 ? 'Download never started' : 'Download stalled (no progress for 60s)',
      );
    }
  }

  throw new Error('Download timed out (30 min hard cap)');
}

async function downloadMecCsv(): Promise<void> {
  console.log('🚀 Starting MEC CSV download...');
  console.log(`📄 Page: ${MEC_PAGE_URL}`);
  console.log(`📁 Output: ${OUTPUT_PATH}`);

  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false, // Non-headless works better with Cloudflare
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
    ],
  });

  try {
    const page = await browser.newPage();

    // Hide webdriver detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    await page.setViewport({ width: 1920, height: 1080 });

    // Configure download behavior
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: dataDir,
    });

    // Navigate to the page with the download link
    console.log('🌐 Navigating to MEC data page...');
    await page.goto(MEC_PAGE_URL, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for potential Cloudflare challenge (polls title + content —
    // the interstitial navigates away when it auto-resolves, so a
    // single content check right after goto races the redirect).
    await waitForCloudflareResolution(page);
    console.log('✅ Page loaded (no active Cloudflare challenge)');
    await delay(2000);

    // Find and click the CSV download link
    console.log('🔍 Looking for CSV download link...');

    // Wait for the page to load content
    await delay(2000);

    // Find link containing the CSV URL
    const csvLinkSelector = `a[href*="${CSV_URL_PATTERN}"]`;
    const csvLink = await page.$(csvLinkSelector);

    if (!csvLink) {
      // Try finding by text content
      const links = await page.$$('a');
      let found = false;

      for (const link of links) {
        const href = await link.evaluate((el) => el.href);
        if (href.includes(CSV_URL_PATTERN)) {
          console.log(`📥 Found CSV link: ${href}`);

          // P1-069 — DON'T delete the existing CSV before the new one
          // arrives. The old script unlinked OUTPUT_PATH at this point;
          // a download failure between unlink and rename used to leave
          // the operator with no CSV at all (we'd already shipped the
          // mistake to staging once). We now keep the old file in
          // place; the rename below atomically swaps it for the new
          // download. If the new download fails, the previous CSV
          // stays usable and the next run retries from the same
          // baseline.

          // Click the link
          console.log('🖱️ Clicking download link...');
          await link.click();

          console.log('⏳ Waiting for download to complete...');
          await waitForDownload(dataDir);

          found = true;
          break;
        }
      }

      if (!found) {
        // Log page content for debugging
        console.log('❌ Could not find CSV link. Page links:');
        for (const link of links) {
          const href = await link.evaluate((el) => el.href);
          if (href.includes('csv') || href.includes('mec')) {
            console.log(`  - ${href}`);
          }
        }
        throw new Error('CSV download link not found on page');
      }
    } else {
      // Direct selector found
      const href = await csvLink.evaluate((el) => el.href);
      console.log(`📥 Found CSV link: ${href}`);

      // Remove old file if exists
      if (fs.existsSync(OUTPUT_PATH)) {
        fs.unlinkSync(OUTPUT_PATH);
      }

      console.log('🖱️ Clicking download link...');
      // Use JavaScript click to avoid clickability issues
      await csvLink.evaluate((el: HTMLAnchorElement) => el.click());

      console.log('⏳ Waiting for download to complete...');
      await waitForDownload(dataDir);
    }

    console.log(`📁 Saved to: ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

// Run
downloadMecCsv()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
