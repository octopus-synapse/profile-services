#!/usr/bin/env npx ts-node
/**
 * MEC CSV Download Script
 * Downloads the MEC courses CSV by navigating to the page and clicking the download link
 * This approach bypasses Cloudflare by simulating real user behavior
 *
 * Usage:
 *   npx ts-node scripts/mec-download.ts
 *   # or with xvfb for headless servers:
 *   xvfb-run --auto-servernum npx ts-node scripts/mec-download.ts
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

    // Wait for potential Cloudflare challenge
    const content = await page.content();
    if (isCloudflareChallenge(content)) {
      console.log('⏳ Cloudflare challenge detected, waiting...');
      await page.waitForFunction(
        () => {
          const body = document.body?.innerHTML || '';
          return !body.includes('Just a moment') && !body.includes('Checking your browser');
        },
        { timeout: 60000 },
      );
      console.log('✅ Cloudflare challenge passed!');
      await delay(2000);
    }

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

          // Remove old file if exists
          if (fs.existsSync(OUTPUT_PATH)) {
            fs.unlinkSync(OUTPUT_PATH);
          }

          // Click the link
          console.log('🖱️ Clicking download link...');
          await link.click();

          // Wait for download to complete (check file existence)
          console.log('⏳ Waiting for download to complete...');
          const maxWait = 180000; // 3 minutes
          const startTime = Date.now();
          let downloadComplete = false;

          while (!downloadComplete && Date.now() - startTime < maxWait) {
            await delay(1000);

            // Check for any .csv file in the directory
            const files = fs.readdirSync(dataDir);
            const csvFile = files.find((f) => f.endsWith('.csv') && !f.endsWith('.crdownload'));

            if (csvFile) {
              const filePath = path.join(dataDir, csvFile);
              const stats = fs.statSync(filePath);

              // Wait for file to be fully written (size > 1MB and stable)
              if (stats.size > 1000000) {
                await delay(2000); // Wait a bit more to ensure it's complete
                const newStats = fs.statSync(filePath);

                if (newStats.size === stats.size) {
                  // Rename to expected name if different
                  if (csvFile !== 'mec-courses.csv') {
                    fs.renameSync(filePath, OUTPUT_PATH);
                  }
                  downloadComplete = true;
                  console.log(`✅ Downloaded ${(newStats.size / 1024 / 1024).toFixed(2)} MB`);
                }
              }
            }
          }

          if (!downloadComplete) {
            throw new Error('Download timed out');
          }

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

      // Wait for download
      console.log('⏳ Waiting for download to complete...');
      let downloadComplete = false;
      const maxWait = 180000;
      const startTime = Date.now();

      while (!downloadComplete && Date.now() - startTime < maxWait) {
        await delay(1000);

        const files = fs.readdirSync(dataDir);
        const csvFile = files.find((f) => f.endsWith('.csv') && !f.endsWith('.crdownload'));

        if (csvFile) {
          const filePath = path.join(dataDir, csvFile);
          const stats = fs.statSync(filePath);

          if (stats.size > 1000000) {
            await delay(2000);
            const newStats = fs.statSync(filePath);

            if (newStats.size === stats.size) {
              if (csvFile !== 'mec-courses.csv') {
                fs.renameSync(filePath, OUTPUT_PATH);
              }
              downloadComplete = true;
              console.log(`✅ Downloaded ${(newStats.size / 1024 / 1024).toFixed(2)} MB`);
            }
          }
        }
      }

      if (!downloadComplete) {
        throw new Error('Download timed out');
      }
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
