#!/usr/bin/env ts-node
/**
 * Schema Export Script
 * Generates a standalone TypeScript file with all Zod schemas for frontend consumption
 *
 * Usage: npm run export:schemas
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_FILE = path.join(
  __dirname,
  '../../profile-frontend/packages/api-client/src/schemas/generated.ts',
);

const SCHEMA_FILES = [
  '../auth/schemas/auth.schemas.ts',
  '../users/schemas/user.schemas.ts',
  '../resumes/schemas/resume.schemas.ts',
  '../onboarding/schemas/onboarding.schema.ts',
];

function generateSchemaExport() {
  let content = `/**
 * Auto-generated Zod Schemas
 * DO NOT EDIT MANUALLY
 * 
 * Generated from: profile-services/src/schemas
 * To update: Run \`npm run export:schemas\` in profile-services
 */

import { z } from 'zod';

`;

  for (const file of SCHEMA_FILES) {
    const filePath = path.join(__dirname, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Remove imports and comments, keep only schema definitions
    const cleanContent = fileContent
      .split('\n')
      .filter((line) => {
        return (
          !line.trim().startsWith('import') &&
          !line.trim().startsWith('/**') &&
          !line.trim().startsWith('*') &&
          !line.trim().startsWith('//')
        );
      })
      .join('\n')
      .replace(/^\/\*[\s\S]*?\*\//gm, ''); // Remove multi-line comments

    content += `\n// ========== ${path.basename(file)} ==========\n`;
    content += cleanContent;
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, content);
  console.log(`✅ Schemas exported to: ${OUTPUT_FILE}`);
}

generateSchemaExport();
