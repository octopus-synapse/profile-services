#!/usr/bin/env bun
/**
 * CLI: Convert SVG to PNG
 *
 * Converts an SVG file to PNG using sharp.
 *
 * Usage:
 *   bun convert-svg-to-png.ts <input.svg> <output.png>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

async function main(): Promise<void> {
  const [inputPath, outputPath] = process.argv.slice(2);

  if (!inputPath || !outputPath) {
    console.error('Usage: convert-svg-to-png <input.svg> <output.png>');
    process.exit(1);
  }

  try {
    const svg = readFileSync(inputPath);
    const png = await sharp(svg).png().toBuffer();
    writeFileSync(outputPath, png);
    console.log(`✅ PNG generated: ${outputPath} (${png.length} bytes)`);
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    process.exit(1);
  }
}

main();
